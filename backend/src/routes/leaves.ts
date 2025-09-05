import { Hono } from "hono";
import {
  authenticate,
  requireAdmin,
  requireApprovalManager,
} from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";
import { googleCalendarService } from "../services/googleCalendar.js";

const leaves = new Hono();

// Get all leave requests for the user's organization
leaves.get("/", authenticate, async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const status = c.req.query("status");
  const userId = c.req.query("userId");

  let query = supabase
    .from("leave_requests")
    .select(
      `
      *,
      users!inner(id, name, email),
      leave_types!inner(id, name, color)
    `,
      { count: 'exact' }
    )
    .eq("users.organization_id", user.organization_id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (
    userId &&
    (user.role === "admin" ||
      user.role === "approval_manager" ||
      user.id === userId)
  ) {
    query = query.eq("user_id", userId);
  } else if (user.role === "team_member") {
    query = query.eq("user_id", user.id);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const {
    data: requests,
    error,
    count,
  } = await query.range(from, to);

  if (error) {
    console.error("Error fetching leave requests:", error);
    return c.json({ error: "Failed to fetch leave requests" }, 500);
  }

  return c.json({
    requests,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
});

// Create a leave request
leaves.post("/", authenticate, async (c) => {
  const user = c.get("user");
  const { leave_type_id, start_date, end_date, reason } = await c.req.json();

  // Validate the leave type belongs to the user's organization
  const { data: leaveType, error: leaveTypeError } = await supabase
    .from("leave_types")
    .select("*")
    .eq("id", leave_type_id)
    .eq("organization_id", user.organization_id)
    .eq("is_active", true)
    .single();

  if (leaveTypeError || !leaveType) {
    return c.json({ error: "Invalid leave type" }, 400);
  }

  // Check for overlapping leave requests
  const { data: overlapping } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .neq("status", "rejected")
    .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

  if (overlapping && overlapping.length > 0) {
    return c.json({ error: "You have overlapping leave requests" }, 400);
  }

  // Create the leave request
  const { data: request, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id: user.id,
      leave_type_id,
      start_date,
      end_date,
      reason,
      status: leaveType.requires_approval ? "pending" : "approved",
    })
    .select(
      `
      *,
      users!inner(id, name, email),
      leave_types!inner(id, name, color)
    `
    )
    .single();

  if (error) {
    console.error("Error creating leave request:", error);
    return c.json({ error: "Failed to create leave request" }, 500);
  }

  // If auto-approved, create calendar event
  if (!leaveType.requires_approval) {
    try {
      // Get user's Google tokens
      const { data: userWithTokens } = await supabase
        .from("users")
        .select("google_tokens")
        .eq("id", user.id)
        .single();

      if (userWithTokens?.google_tokens) {
        googleCalendarService.setCredentials(userWithTokens.google_tokens);
        const eventId = await googleCalendarService.createLeaveEvent({
          employeeName: user.name,
          leaveType: leaveType.name,
          startDate: start_date,
          endDate: end_date,
          reason,
        });

        // Update request with calendar event ID
        await supabase
          .from("leave_requests")
          .update({ calendar_event_id: eventId })
          .eq("id", request.id);
      }
    } catch (calendarError) {
      console.error("Error creating calendar event:", calendarError);
    }
  }

  return c.json({ request }, 201);
});

// Approve/Reject a leave request
leaves.patch("/:id/status", authenticate, requireApprovalManager, async (c) => {
  const user = c.get("user");
  const requestId = c.req.param("id");
  const { status, rejection_reason } = await c.req.json();

  if (!["approved", "rejected"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  // Get the leave request
  const { data: request, error: fetchError } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      users!inner(id, name, email, organization_id, google_tokens),
      leave_types!inner(id, name, color)
    `
    )
    .eq("id", requestId)
    .eq("users.organization_id", user.organization_id)
    .single();

  if (fetchError || !request) {
    return c.json({ error: "Leave request not found" }, 404);
  }

  if (request.status !== "pending") {
    return c.json({ error: "Leave request is not pending" }, 400);
  }

  // Update the leave request
  const updateData: any = {
    status,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  };

  if (status === "rejected" && rejection_reason) {
    updateData.rejection_reason = rejection_reason;
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from("leave_requests")
    .update(updateData)
    .eq("id", requestId)
    .select(
      `
      *,
      users!inner(id, name, email),
      leave_types!inner(id, name, color)
    `
    )
    .single();

  if (updateError) {
    console.error("Error updating leave request:", updateError);
    return c.json({ error: "Failed to update leave request" }, 500);
  }

  // If approved, create calendar event
  if (status === "approved") {
    try {
      if (request.users.google_tokens) {
        googleCalendarService.setCredentials(request.users.google_tokens);
        const eventId = await googleCalendarService.createLeaveEvent({
          employeeName: request.users.name,
          leaveType: request.leave_types.name,
          startDate: request.start_date,
          endDate: request.end_date,
          reason: request.reason,
        });

        // Update request with calendar event ID
        await supabase
          .from("leave_requests")
          .update({ calendar_event_id: eventId })
          .eq("id", requestId);
      }
    } catch (calendarError) {
      console.error("Error creating calendar event:", calendarError);
    }
  }

  return c.json({ request: updatedRequest });
});

// Cancel a leave request
leaves.patch("/:id/cancel", authenticate, async (c) => {
  const user = c.get("user");
  const requestId = c.req.param("id");

  // Get the leave request
  const { data: request, error: fetchError } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !request) {
    return c.json({ error: "Leave request not found" }, 404);
  }

  if (!["pending", "approved"].includes(request.status)) {
    return c.json({ error: "Cannot cancel this leave request" }, 400);
  }

  // Update the leave request
  const { data: updatedRequest, error: updateError } = await supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .select(
      `
      *,
      users!inner(id, name, email),
      leave_types!inner(id, name, color)
    `
    )
    .single();

  if (updateError) {
    console.error("Error cancelling leave request:", updateError);
    return c.json({ error: "Failed to cancel leave request" }, 500);
  }

  // Remove calendar event if exists
  if (request.calendar_event_id) {
    try {
      const { data: userWithTokens } = await supabase
        .from("users")
        .select("google_tokens")
        .eq("id", user.id)
        .single();

      if (userWithTokens?.google_tokens) {
        googleCalendarService.setCredentials(userWithTokens.google_tokens);
        await googleCalendarService.deleteLeaveEvent(request.calendar_event_id);
      }
    } catch (calendarError) {
      console.error("Error deleting calendar event:", calendarError);
    }
  }

  return c.json({ request: updatedRequest });
});

export default leaves;
