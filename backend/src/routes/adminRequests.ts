import { Hono } from "hono";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";
import { emailService } from "../services/emailService.js";
import { config } from "../config/index.js";
import { createNotification } from "./notifications.js";
import { updateAdminCount } from "../services/organizationService.js";

const adminRequests = new Hono();

const isMasterUser = (email: string): boolean => {
  return email?.toLowerCase() === config.MASTER_EMAIL?.toLowerCase();
};

adminRequests.get("/status", authenticate, async (c) => {
  const user = c.get("user");
  const { data: pendingRequest, error } = await supabase
    .from("admin_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking admin request status:", error);
    return c.json({ error: "Failed to check request status" }, 500);
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("admin_count")
    .eq("id", user.organization_id)
    .single();

  return c.json({
    hasPendingRequest: !!pendingRequest,
    pendingRequest: pendingRequest || null,
    organizationHasAdmin: (org?.admin_count || 0) > 0,
  });
});

adminRequests.post("/", authenticate, async (c) => {
  const user = c.get("user");
  const { targetAdminEmail, message } = await c.req.json();

  if (user.role === "admin") {
    return c.json({ error: "You are already an admin" }, 400);
  }

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: existingRequests } = await supabase
    .from("admin_requests")
    .select("*")
    .eq("user_id", user.id)
    .or(
      `status.eq.pending,and(status.in.(approved,denied),requested_at.gte.${twentyFourHoursAgo})`
    )
    .order("requested_at", { ascending: false })
    .limit(1);

  if (existingRequests && existingRequests.length > 0) {
    const latestRequest = existingRequests[0];
    if (latestRequest.status === "pending") {
      return c.json(
        {
          error:
            "You already have a pending request. Please wait for it to be processed.",
        },
        400
      );
    } else if (
      latestRequest.status === "denied" ||
      latestRequest.status === "approved"
    ) {
      const requestTime = new Date(latestRequest.requested_at);
      const timeDiff = Date.now() - requestTime.getTime();
      const hoursLeft = Math.ceil(
        (24 * 60 * 60 * 1000 - timeDiff) / (60 * 60 * 1000)
      );

      return c.json(
        {
          error: `You can only submit one admin request per 24 hours. Please wait ${hoursLeft} more hours before submitting another request.`,
        },
        400
      );
    }
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("admin_count, domain, name")
    .eq("id", user.organization_id)
    .single();

  // Double-check admin count in case it's out of sync
  const { count: actualAdminCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", user.organization_id)
    .eq("role", "admin");

  // If admin count is out of sync, update it
  if (org && org.admin_count !== (actualAdminCount || 0)) {
    console.log(`Admin count mismatch for org ${org.name}: stored=${org.admin_count}, actual=${actualAdminCount}`);
    
    await supabase
      .from("organizations")
      .update({ admin_count: actualAdminCount || 0 })
      .eq("id", user.organization_id);
    
    // Update the org object with the correct count
    org.admin_count = actualAdminCount || 0;
  }

  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }

  let recipientEmail;
  if (org.admin_count > 0) {
    if (!targetAdminEmail) {
      return c.json(
        { error: "Please select an admin to send the request to" },
        400
      );
    }
    const { data: targetAdmin } = await supabase
      .from("users")
      .select("email")
      .eq("email", targetAdminEmail)
      .eq("organization_id", user.organization_id)
      .eq("role", "admin")
      .single();

    if (!targetAdmin) {
      return c.json(
        { error: "Selected admin not found in your organization" },
        400
      );
    }

    recipientEmail = targetAdminEmail;
  } else {
    recipientEmail = config.MASTER_EMAIL;
  }

  const { data: request, error: requestError } = await supabase
    .from("admin_requests")
    .insert({
      user_id: user.id,
      organization_id: user.organization_id,
      target_admin_email: org.admin_count > 0 ? recipientEmail : null,
      status: "pending",
    })
    .select()
    .single();

  if (requestError) {
    console.error("Error creating admin request:", requestError);
    return c.json({ error: "Failed to create admin request" }, 500);
  }
  try {
    const approveLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/admin-approval?token=${request.approval_token}&action=approve`;
    const denyLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/admin-approval?token=${request.approval_token}&action=deny`;

    const isRequestToMaster = !org.admin_count;
    const subject = isRequestToMaster
      ? `New Admin Request for ${org.name}`
      : `Admin Access Request from ${user.name}`;

    const emailBody = `
      <h2>${subject}</h2>
      <p><strong>Requester:</strong> ${user.name} (${user.email})</p>
      <p><strong>Organization:</strong> ${org.name} (${org.domain})</p>
      <p><strong>Request Date:</strong> ${new Date(
        request.requested_at
      ).toLocaleString()}</p>
      
      ${
        message
          ? `
        <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <p><strong>Message from ${user.name}:</strong></p>
          <p style="font-style: italic;">"${message}"</p>
        </div>
      `
          : ""
      }
      
      ${
        isRequestToMaster
          ? `
        <p>This user is requesting admin access for their organization. As the master administrator, 
        you can approve or deny this request.</p>
      `
          : `
        <p>This user is requesting admin access to your organization. As an existing admin, 
        you can approve or deny this request.</p>
      `
      }
      
      <div style="margin: 20px 0;">
        <a href="${approveLink}" 
           style="background-color: #10B981; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px; margin-right: 10px;">
          ✓ Approve Request
        </a>
        <a href="${denyLink}" 
           style="background-color: #EF4444; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px;">
          ✗ Deny Request  
        </a>
      </div>
      
      <p><small>This request will expire in 24 hours.</small></p>
    `;

    const emailResult = await emailService.sendEmail(
      recipientEmail,
      subject,
      emailBody
    );
  } catch (emailError) {
    console.error("Email error", emailError);
  }

  // Send real-time update to master dashboard if request goes to master
  if (!org.admin_count) {
    try {
      const { websocketManager } = await import("../services/websocketManager.js");
      await websocketManager.sendMasterUpdate({
        type: 'new_admin_request',
        request: {
          id: request.id,
          user: { name: user.name, email: user.email },
          organization: { name: org.name, domain: org.domain },
          requested_at: request.requested_at
        }
      });
    } catch (error) {
      console.error("Error sending master update:", error);
    }
  }

  return c.json({
    message: "Admin request submitted successfully",
    request: {
      id: request.id,
      status: request.status,
      expires_at: request.expires_at,
      target_admin_email: request.target_admin_email,
    },
  });
});

adminRequests.get("/org-admins", authenticate, async (c) => {
  const user = c.get("user");

  const { data: admins, error } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("organization_id", user.organization_id)
    .eq("role", "admin")
    .order("name");

  if (error) {
    console.error("Error fetching organization admins:", error);
    return c.json({ error: "Failed to fetch admins" }, 500);
  }

  return c.json({ admins: admins || [] });
});

adminRequests.get("/pending", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");

  const { data: requests, error } = await supabase
    .from("admin_requests")
    .select(
      `
      *,
      users!inner(id, name, email, organization_id)
    `
    )
    .eq("users.organization_id", user.organization_id)
    .eq("status", "pending")
    .not("target_admin_email", "is", null) // Only show requests meant for organization admins
    .gte("expires_at", new Date().toISOString())
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("Error fetching admin requests:", error);
    return c.json({ error: "Failed to fetch admin requests" }, 500);
  }

  return c.json({ requests: requests || [] });
});

adminRequests.post("/approve", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const { requestId, action, reason } = await c.req.json();

  if (!requestId || !action) {
    return c.json({ error: "Missing requestId or action" }, 400);
  }

  if (!["approve", "deny"].includes(action)) {
    return c.json({ error: "Invalid action" }, 400);
  }
  const { data: request, error: fetchError } = await supabase
    .from("admin_requests")
    .select(
      `
      *,
      users!inner(id, name, email, organization_id)
    `
    )
    .eq("id", requestId)
    .eq("users.organization_id", user.organization_id)
    .eq("status", "pending")
    .single();

  if (fetchError || !request) {
    return c.json({ error: "Request not found or access denied" }, 404);
  }

  if (new Date(request.expires_at) < new Date()) {
    await supabase
      .from("admin_requests")
      .update({ status: "expired" })
      .eq("id", request.id);

    return c.json({ error: "Request has expired" }, 400);
  }
  const newStatus = action === "approve" ? "approved" : "denied";
  const processedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("admin_requests")
    .update({
      status: newStatus,
      processed_at: processedAt,
      processed_by: user.email,
      reason: action === "deny" ? reason : null,
    })
    .eq("id", request.id);

  if (updateError) {
    console.error("Error updating admin request:", updateError);
    return c.json({ error: "Failed to process request" }, 500);
  }

  if (action === "approve") {
    const { data: updatedUser, error: roleUpdateError } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", request.users.id)
      .select()
      .single();

    if (roleUpdateError) {
      console.error("Error updating user role:", roleUpdateError);
      return c.json({ error: "Failed to update user role" }, 500);
    }

    // Update organization admin count
    await updateAdminCount(request.users.organization_id);

    // Invalidate all caches affected by role change
    const { cacheService } = await import("../services/cacheService.js");
    await cacheService.invalidateOnRoleChange(request.users.id, request.users.organization_id);

    // Send real-time notification about role change
    const { websocketManager } = await import("../services/websocketManager.js");
    websocketManager.sendUserUpdate(request.users.id, {
      type: 'role_updated',
      user: updatedUser
    });
  }

  try {
    const subject = `Admin Request ${
      action === "approve" ? "Approved" : "Denied"
    }`;
    const emailBody = `
      <h2>Your admin request has been ${
        action === "approve" ? "approved" : "denied"
      }</h2>
      <p><strong>Processed by:</strong> ${user.name} (${user.email})</p>
      <p><strong>Decision Date:</strong> ${new Date(
        processedAt
      ).toLocaleString()}</p>
      
      ${
        action === "approve"
          ? `<p style="color: #10B981;">✓ Congratulations! You now have admin access.</p>`
          : `<p style="color: #EF4444;">✗ Your admin request has been denied.</p>
           ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`
      }
    `;

    await emailService.sendEmail(request.users.email, subject, emailBody);
  } catch (emailError) {
    console.error("Failed to send notification email:", emailError);
  }

  const notificationType =
    action === "approve" ? "admin_request_approved" : "admin_request_denied";
  const title =
    action === "approve" ? "Admin Request Approved" : "Admin Request Denied";
  const message =
    action === "approve"
      ? "Congratulations! Your admin request has been approved. You now have admin access."
      : `Your admin request has been denied${reason ? `: ${reason}` : ""}`;

  await createNotification(
    request.users.id,
    user.id,
    notificationType,
    title,
    message,
    {
      admin_request_id: request.id,
      processed_by: user.email,
      processed_at: processedAt,
      reason: reason || null,
    }
  );

  return c.json({
    message: `Request ${
      action === "approve" ? "approved" : "denied"
    } successfully`,
    status: newStatus,
  });
});

adminRequests.post("/process", async (c) => {
  const { token, action, reason } = await c.req.json();

  if (!token || !action) {
    return c.json({ error: "Missing token or action" }, 400);
  }

  if (!["approve", "deny"].includes(action)) {
    return c.json({ error: "Invalid action" }, 400);
  }

  const { data: request, error: fetchError } = await supabase
    .from("admin_requests")
    .select(
      `
      *,
      users!inner(id, name, email, organization_id),
      organizations!inner(id, name, domain)
    `
    )
    .eq("approval_token", token)
    .eq("status", "pending")
    .single();

  if (fetchError || !request) {
    return c.json({ error: "Invalid or expired request token" }, 404);
  }

  if (new Date(request.expires_at) < new Date()) {
    await supabase
      .from("admin_requests")
      .update({ status: "expired" })
      .eq("id", request.id);

    return c.json({ error: "Request has expired" }, 400);
  }

  const newStatus = action === "approve" ? "approved" : "denied";
  const processedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("admin_requests")
    .update({
      status: newStatus,
      processed_at: processedAt,
      processed_by: request.target_admin_email || config.MASTER_EMAIL,
      reason: action === "deny" ? reason : null,
    })
    .eq("id", request.id);

  if (updateError) {
    console.error("Error updating admin request:", updateError);
    return c.json({ error: "Failed to process request" }, 500);
  }

  if (action === "approve") {
    const { data: updatedUser, error: roleUpdateError } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", request.users.id)
      .select()
      .single();

    if (roleUpdateError) {
      console.error("Error updating user role:", roleUpdateError);
      return c.json({ error: "Failed to update user role" }, 500);
    }

    // Update organization admin count
    await updateAdminCount(request.users.organization_id);

    // Invalidate all caches affected by role change
    const { cacheService } = await import("../services/cacheService.js");
    await cacheService.invalidateOnRoleChange(request.users.id, request.users.organization_id);

    // Send real-time notification about role change
    const { websocketManager } = await import("../services/websocketManager.js");
    websocketManager.sendUserUpdate(request.users.id, {
      type: 'role_updated',
      user: updatedUser
    });
  }

  try {
    const subject = `Admin Request ${
      action === "approve" ? "Approved" : "Denied"
    }`;
    const emailBody = `
      <h2>Your admin request has been ${
        action === "approve" ? "approved" : "denied"
      }</h2>
      <p><strong>Organization:</strong> ${request.organizations.name}</p>
      <p><strong>Decision Date:</strong> ${new Date(
        processedAt
      ).toLocaleString()}</p>
      
      ${
        action === "approve"
          ? `
        <p style="color: #10B981;">
          ✓ Congratulations! You now have admin access to your organization's leave management system.
          Please log in to access your admin features.
        </p>
      `
          : `
        <p style="color: #EF4444;">
          ✗ Your admin request has been denied.
          ${reason ? `<br><strong>Reason:</strong> ${reason}` : ""}
        </p>
        <p>You can submit a new request in 24 hours if needed.</p>
      `
      }
    `;

    await emailService.sendEmail(request.users.email, subject, emailBody);
  } catch (emailError) {
    console.error("Failed to send notification email:", emailError);
  }

  return c.json({
    message: `Request ${
      action === "approve" ? "approved" : "denied"
    } successfully`,
    status: newStatus,
  });
});

export default adminRequests;
