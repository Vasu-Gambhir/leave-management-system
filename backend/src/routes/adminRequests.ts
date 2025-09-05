import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";
import { emailService } from "../services/emailService.js";
import { config } from "../config/index.js";

console.log("🔥 adminRequests.ts module loaded at", new Date().toISOString());

const adminRequests = new Hono();

// Utility function to check if user is master
const isMasterUser = (email: string): boolean => {
  return email?.toLowerCase() === config.MASTER_EMAIL?.toLowerCase();
};

// Get current user's admin request status
adminRequests.get("/status", authenticate, async (c) => {
  const user = c.get("user");

  // Check if user already has pending request
  const { data: pendingRequest, error } = await supabase
    .from("admin_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    console.error("Error checking admin request status:", error);
    return c.json({ error: "Failed to check request status" }, 500);
  }

  // Get organization admin count
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

// Submit admin access request
adminRequests.post("/", authenticate, async (c) => {
  console.log("🚀 ADMIN REQUEST API CALLED! 🚀");
  console.log("Timestamp:", new Date().toISOString());
  const user = c.get("user");
  const { targetAdminEmail, message } = await c.req.json();

  // Check if user is already admin
  if (user.role === "admin") {
    return c.json({ error: "You are already an admin" }, 400);
  }

  // Check for existing pending request within 24 hours
  const { data: existingRequest } = await supabase
    .from("admin_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .single();

  if (existingRequest) {
    return c.json(
      {
        error:
          "You already have a pending request. Please wait 24 hours before submitting another.",
      },
      400
    );
  }

  // Get organization admin count
  const { data: org } = await supabase
    .from("organizations")
    .select("admin_count, domain, name")
    .eq("id", user.organization_id)
    .single();

  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }

  // Determine target recipient
  let recipientEmail;
  if (org.admin_count > 0) {
    // Organization has admins - validate target admin email if provided
    if (!targetAdminEmail) {
      return c.json(
        { error: "Please select an admin to send the request to" },
        400
      );
    }

    // Verify the target admin exists in the organization
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
    // No admins - send to master
    recipientEmail = config.MASTER_EMAIL;
  }

  // Create admin request
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

  // Send email notification
  try {
    console.log("Attempting to send email to:", recipientEmail);
    console.log("Email service config:", {
      service: config.EMAIL_SERVICE,
      user: config.EMAIL_USER,
      hasPassword: !!config.EMAIL_PASS,
    });

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

    console.log("Email sent successfully:", emailResult);
  } catch (emailError) {
    console.error("Failed to send notification email:", emailError);
    // Don't fail the request if email fails - but log the detailed error
    if (emailError instanceof Error) {
      console.error("Email error details:", emailError.message);
      console.error("Email error stack:", emailError.stack);
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

// Get organization admins (for dropdown in request form)
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

// Approve/Deny admin request (via email link)
adminRequests.post("/process", async (c) => {
  const { token, action, reason } = await c.req.json();

  if (!token || !action) {
    return c.json({ error: "Missing token or action" }, 400);
  }

  if (!["approve", "deny"].includes(action)) {
    return c.json({ error: "Invalid action" }, 400);
  }

  // Find the admin request
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

  // Check if request has expired
  if (new Date(request.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from("admin_requests")
      .update({ status: "expired" })
      .eq("id", request.id);

    return c.json({ error: "Request has expired" }, 400);
  }

  // Process the request
  const newStatus = action === "approve" ? "approved" : "denied";
  const processedAt = new Date().toISOString();

  // Update request status
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

  // If approved, update user role to admin
  if (action === "approve") {
    const { error: roleUpdateError } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", request.users.id);

    if (roleUpdateError) {
      console.error("Error updating user role:", roleUpdateError);
      return c.json({ error: "Failed to update user role" }, 500);
    }
  }

  // Send notification email to requester
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
    // Don't fail the request if email fails
  }

  return c.json({
    message: `Request ${
      action === "approve" ? "approved" : "denied"
    } successfully`,
    status: newStatus,
  });
});

export default adminRequests;
