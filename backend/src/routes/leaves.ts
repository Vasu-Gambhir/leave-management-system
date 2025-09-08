import { Hono } from "hono";
import {
  authenticate,
  requireAdmin,
  requireApprovalManager,
} from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";
import { googleCalendarService } from "../services/googleCalendar.js";
import { createNotification } from "./notifications.js";
import { cacheService } from "../services/cacheService.js";
import { emailService } from "../services/emailFactory.js";

const leaves = new Hono();

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
      user:users!leave_requests_user_id_fkey(id, name, email, organization_id, profile_picture),
      leave_types!inner(id, name, color)
    `,
      { count: "exact" }
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
  } else {
    if (user.role === "approval_manager" || user.role === "admin") {
      query = query.eq("requested_approver_id", user.id);
    }
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: requests, error, count } = await query.range(from, to);

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

leaves.post("/", authenticate, async (c) => {
  const user = c.get("user");
  const { leave_type_id, start_date, end_date, reason, requested_approver_id } =
    await c.req.json();

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

  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const today = new Date();
  const maxAllowedDate = new Date();
  maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 3);

  if (startDate > endDate) {
    return c.json({ error: "Start date must be before end date" }, 400);
  }

  if (startDate < today) {
    return c.json(
      { error: "Cannot create leave requests for past dates" },
      400
    );
  }

  if (startDate > maxAllowedDate || endDate > maxAllowedDate) {
    return c.json(
      { error: "Leave requests can only be created up to 3 months in advance" },
      400
    );
  }

  if (requested_approver_id) {
    const { data: approver, error: approverError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", requested_approver_id)
      .eq("organization_id", user.organization_id)
      .single();

    if (approverError || !approver) {
      return c.json({ error: "Invalid approver selected" }, 400);
    }

    const canApprove =
      (user.role === "team_member" &&
        ["approval_manager", "admin"].includes(approver.role)) ||
      (user.role === "approval_manager" &&
        approver.role === "admin" &&
        approver.id !== user.id) ||
      (user.role === "admin" && approver.role === "admin");

    if (!canApprove) {
      return c.json(
        { error: "Selected approver cannot approve requests from your role" },
        400
      );
    }
  }

  const requestedWorkingDays = await calculateWorkingDays(
    startDate,
    endDate,
    user.organization_id
  );

  const { data: overlapping, error: overlapError } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, leave_types(name)")
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .neq("status", "rejected");

  if (overlapError) {
    console.error("Error checking overlap:", overlapError);
    return c.json({ error: "Failed to validate dates" }, 500);
  }

  const hasOverlap = overlapping?.some((existing) => {
    const existingStart = new Date(existing.start_date);
    const existingEnd = new Date(existing.end_date);

    return startDate <= existingEnd && endDate >= existingStart;
  });

  if (hasOverlap) {
    return c.json(
      {
        error:
          "You have overlapping leave requests for these dates. Please check your existing requests.",
      },
      400
    );
  }

  if (leaveType.max_days_per_year) {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const { data: usedLeaves, error: usedLeavesError } = await supabase
      .from("leave_requests")
      .select("start_date, end_date")
      .eq("user_id", user.id)
      .eq("leave_type_id", leave_type_id)
      .in("status", ["approved", "pending"])
      .gte("start_date", yearStart)
      .lte("end_date", yearEnd);

    if (usedLeavesError) {
      console.error("Error fetching used leaves:", usedLeavesError);
      return c.json({ error: "Failed to validate leave balance" }, 500);
    }

    let totalUsedDays = 0;
    for (const leave of usedLeaves || []) {
      const leaveStartDate = new Date(leave.start_date);
      const leaveEndDate = new Date(leave.end_date);
      totalUsedDays += await calculateWorkingDays(
        leaveStartDate,
        leaveEndDate,
        user.organization_id
      );
    }

    const remainingDays = leaveType.max_days_per_year - totalUsedDays;

    if (requestedWorkingDays > remainingDays) {
      return c.json(
        {
          error: `Insufficient leave balance. You have ${remainingDays} days remaining for ${leaveType.name}, but requested ${requestedWorkingDays} working days.`,
        },
        400
      );
    }
  }

  const { data: request, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id: user.id,
      leave_type_id,
      start_date,
      end_date,
      reason,
      requested_approver_id,
      status: leaveType.requires_approval ? "pending" : "approved",
    })
    .select(
      `
      *,
      users!leave_requests_user_id_fkey(id, name, email),
      leave_types!inner(id, name, color)
    `
    )
    .single();

  if (error) {
    console.error("Error creating leave request:", error);
    return c.json({ error: "Failed to create leave request" }, 500);
  }

  if (!leaveType.requires_approval) {
    try {
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

        await supabase
          .from("leave_requests")
          .update({ calendar_event_id: eventId })
          .eq("id", request.id);
      }
    } catch (calendarError) {
      console.error("Error creating calendar event:", calendarError);
    }
  }

  if (leaveType.requires_approval && requested_approver_id) {
    const startDateFormatted = new Date(start_date).toLocaleDateString();
    const endDateFormatted = new Date(end_date).toLocaleDateString();
    const dateRange =
      startDateFormatted === endDateFormatted
        ? startDateFormatted
        : `${startDateFormatted} - ${endDateFormatted}`;

    await createNotification(
      requested_approver_id,
      user.id,
      "leave_request",
      "New Leave Request",
      `${user.name} has requested ${leaveType.name} leave for ${dateRange}`,
      {
        leave_request_id: request.id,
        start_date,
        end_date,
        leave_type: leaveType.name,
        requester_name: user.name,
      }
    );

    // Send email notification to the approver
    try {
      const { data: approver, error: approverError } = await supabase
        .from("users")
        .select("email")
        .eq("id", requested_approver_id)
        .single();

      if (!approverError && approver?.email) {
        await emailService.sendLeaveRequestNotification({
          to: approver.email,
          employeeName: user.name,
          leaveType: leaveType.name,
          startDate: start_date,
          endDate: end_date,
          reason,
        });
      }
    } catch (emailError) {
      console.error("Error sending leave request email:", emailError);
    }
  }

  await cacheService.invalidateUserLeaveBalance(user.id);

  return c.json({ request }, 201);
});

leaves.patch("/:id/status", authenticate, requireApprovalManager, async (c) => {
  const user = c.get("user");
  const requestId = c.req.param("id");
  const { status, rejection_reason } = await c.req.json();

  if (!["approved", "rejected"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const { data: request, error: fetchError } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      users!leave_requests_user_id_fkey(id, name, email, organization_id, google_tokens),
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
      users!leave_requests_user_id_fkey(id, name, email),
      leave_types!inner(id, name, color)
    `
    )
    .single();

  if (updateError) {
    console.error("Error updating leave request:", updateError);
    return c.json({ error: "Failed to update leave request" }, 500);
  }

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

        await supabase
          .from("leave_requests")
          .update({ calendar_event_id: eventId })
          .eq("id", requestId);
      }
    } catch (calendarError) {
      console.error("Error creating calendar event:", calendarError);
    }
  }

  const startDateFormatted = new Date(request.start_date).toLocaleDateString();
  const endDateFormatted = new Date(request.end_date).toLocaleDateString();
  const dateRange =
    startDateFormatted === endDateFormatted
      ? startDateFormatted
      : `${startDateFormatted} - ${endDateFormatted}`;

  const notificationType =
    status === "approved" ? "leave_approved" : "leave_rejected";
  const title =
    status === "approved" ? "Leave Request Approved" : "Leave Request Rejected";
  const message =
    status === "approved"
      ? `Your ${request.leave_types.name} leave request for ${dateRange} has been approved`
      : `Your ${
          request.leave_types.name
        } leave request for ${dateRange} has been rejected${
          rejection_reason ? `: ${rejection_reason}` : ""
        }`;

  await createNotification(
    request.user_id,
    user.id,
    notificationType,
    title,
    message,
    {
      leave_request_id: request.id,
      start_date: request.start_date,
      end_date: request.end_date,
      leave_type: request.leave_types.name,
      approver_name: user.name,
      rejection_reason: rejection_reason || null,
    }
  );

  // Send email notification to the employee
  try {
    await emailService.sendLeaveApprovalNotification({
      to: request.users.email,
      employeeName: request.users.name,
      leaveType: request.leave_types.name,
      startDate: request.start_date,
      endDate: request.end_date,
      status: status,
      approverName: user.name,
      rejectionReason: rejection_reason,
    });
  } catch (emailError) {
    console.error("Error sending leave approval email:", emailError);
  }

  await cacheService.invalidateUserLeaveBalance(request.user_id);

  return c.json({ request: updatedRequest });
});

leaves.patch("/:id/cancel", authenticate, async (c) => {
  const user = c.get("user");
  const requestId = c.req.param("id");

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

  const { data: updatedRequest, error: updateError } = await supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .select(
      `
      *,
      users!leave_requests_user_id_fkey(id, name, email),
      leave_types!inner(id, name, color)
    `
    )
    .single();

  if (updateError) {
    console.error("Error cancelling leave request:", updateError);
    return c.json({ error: "Failed to cancel leave request" }, 500);
  }

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

  await cacheService.invalidateUserLeaveBalance(user.id);

  return c.json({ request: updatedRequest });
});

leaves.get("/balance", authenticate, async (c) => {
  const user = c.get("user");
  const targetUserId = c.req.query("userId") || user.id;

  if (
    targetUserId !== user.id &&
    !["admin", "approval_manager"].includes(user.role)
  ) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const currentYear = new Date().getFullYear();

    const cachedBalance = await cacheService.getLeaveBalance(
      targetUserId,
      currentYear
    );
    if (cachedBalance) {
      return c.json({ balances: cachedBalance });
    }

    const { data: leaveTypes, error: leaveTypesError } = await supabase
      .from("leave_types")
      .select("*")
      .eq("organization_id", user.organization_id)
      .eq("is_active", true);

    if (leaveTypesError) {
      console.error("Error fetching leave types:", leaveTypesError);
      return c.json({ error: "Failed to fetch leave types" }, 500);
    }

    const { data: organization } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", user.organization_id)
      .single();

    let workingDays = [1, 2, 3, 4, 5];

    if (organization?.settings?.workingDays) {
      workingDays = organization.settings.workingDays;
    }

    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const balances = await Promise.all(
      leaveTypes.map(async (leaveType) => {
        const { data: usedLeaves, error: usedLeavesError } = await supabase
          .from("leave_requests")
          .select("start_date, end_date, status")
          .eq("user_id", targetUserId)
          .eq("leave_type_id", leaveType.id)
          .in("status", ["approved", "pending"])
          .gte("start_date", yearStart)
          .lte("end_date", yearEnd);

        const { data: nextYearLeaves, error: nextYearError } = await supabase
          .from("leave_requests")
          .select("start_date, end_date, status")
          .eq("user_id", targetUserId)
          .eq("leave_type_id", leaveType.id)
          .in("status", ["approved", "pending"])
          .gte("start_date", `${currentYear + 1}-01-01`)
          .lte("end_date", `${currentYear + 1}-12-31`);

        const allUsedLeaves = [
          ...(usedLeaves || []),
          ...(nextYearLeaves || []),
        ];

        if (usedLeavesError) {
          console.error("Error fetching used leaves:", usedLeavesError);
          return {
            leave_type: leaveType,
            used: 0,
            remaining: leaveType.max_days_per_year || 0,
            total_allowed: leaveType.max_days_per_year || 0,
          };
        }

        let totalUsedDays = 0;
        for (const leave of allUsedLeaves || []) {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          const workingDaysForLeave = calculateWorkingDaysSync(
            startDate,
            endDate,
            workingDays
          );
          totalUsedDays += workingDaysForLeave;
        }

        const totalAllowed = leaveType.max_days_per_year || 0;
        const remaining = Math.max(0, totalAllowed - totalUsedDays);

        return {
          leave_type: leaveType,
          used: totalUsedDays,
          remaining,
          total_allowed: totalAllowed,
        };
      })
    );

    await cacheService.cacheLeaveBalance(targetUserId, currentYear, balances);

    return c.json({ balances });
  } catch (error) {
    console.error("Error calculating leave balance:", error);
    return c.json({ error: "Failed to calculate leave balance" }, 500);
  }
});

function calculateWorkingDaysSync(
  startDate: Date,
  endDate: Date,
  workingDays: number[]
): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (workingDays.includes(dayOfWeek)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

async function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  organizationId: string
): Promise<number> {
  const { data: organization } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  let workingDays = [1, 2, 3, 4, 5];

  if (organization?.settings?.workingDays) {
    workingDays = organization.settings.workingDays;
  }

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (workingDays.includes(dayOfWeek)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

leaves.post("/:id/sync-calendar", authenticate, async (c) => {
  const user = c.get("user");
  const requestId = c.req.param("id");

  const { data: request, error } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      users!leave_requests_user_id_fkey(id, name, email, google_tokens),
      leave_types!inner(id, name, color)
    `
    )
    .eq("id", requestId)
    .single();

  if (error || !request) {
    return c.json({ error: "Leave request not found" }, 404);
  }

  const canSync =
    user.role === "admin" ||
    user.role === "approval_manager" ||
    request.user_id === user.id;

  if (!canSync) {
    return c.json({ error: "Permission denied" }, 403);
  }

  if (request.status !== "approved") {
    return c.json(
      { error: "Only approved leave requests can be synced to calendar" },
      400
    );
  }

  if (request.calendar_event_id) {
    return c.json(
      { error: "Leave request is already synced to calendar" },
      400
    );
  }

  if (!request.users.google_tokens) {
    return c.json({ error: "User has not connected Google Calendar" }, 400);
  }

  try {
    googleCalendarService.setCredentials(request.users.google_tokens);
    const eventId = await googleCalendarService.createLeaveEvent({
      employeeName: request.users.name,
      leaveType: request.leave_types.name,
      startDate: request.start_date,
      endDate: request.end_date,
      reason: request.reason,
    });

    const { error: updateError } = await supabase
      .from("leave_requests")
      .update({ calendar_event_id: eventId })
      .eq("id", requestId);

    if (updateError) {
      console.error(
        "Error updating leave request with calendar event ID:",
        updateError
      );
      return c.json({ error: "Failed to update leave request" }, 500);
    }

    return c.json({
      message: "Leave request synced to Google Calendar successfully",
      calendar_event_id: eventId,
    });
  } catch (error) {
    console.error("Error creating calendar event:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("refresh token") ||
        error.message.includes("re-authorize")
      ) {
        return c.json(
          {
            error:
              "Google Calendar authorization has expired. Please reconnect your Google account in settings.",
            requiresReauth: true,
          },
          401
        );
      }
    }

    return c.json({ error: "Failed to sync to Google Calendar" }, 500);
  }
});

leaves.delete("/:id/sync-calendar", authenticate, async (c) => {
  const user = c.get("user");
  const requestId = c.req.param("id");

  const { data: request, error } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      users!leave_requests_user_id_fkey(id, name, email, google_tokens)
    `
    )
    .eq("id", requestId)
    .single();

  if (error || !request) {
    return c.json({ error: "Leave request not found" }, 404);
  }

  const canUnsync =
    user.role === "admin" ||
    user.role === "approval_manager" ||
    request.user_id === user.id;

  if (!canUnsync) {
    return c.json({ error: "Permission denied" }, 403);
  }

  if (!request.calendar_event_id) {
    return c.json({ error: "Leave request is not synced to calendar" }, 400);
  }

  if (!request.users.google_tokens) {
    return c.json({ error: "User has not connected Google Calendar" }, 400);
  }

  try {
    googleCalendarService.setCredentials(request.users.google_tokens);
    await googleCalendarService.deleteLeaveEvent(request.calendar_event_id);

    const { error: updateError } = await supabase
      .from("leave_requests")
      .update({ calendar_event_id: null })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating leave request:", updateError);
      return c.json({ error: "Failed to update leave request" }, 500);
    }

    return c.json({
      message: "Leave request unsynced from Google Calendar successfully",
    });
  } catch (error) {
    console.error("Error deleting calendar event:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("refresh token") ||
        error.message.includes("re-authorize")
      ) {
        return c.json(
          {
            error:
              "Google Calendar authorization has expired. Please reconnect your Google account in settings.",
            requiresReauth: true,
          },
          401
        );
      }
    }

    return c.json({ error: "Failed to unsync from Google Calendar" }, 500);
  }
});

export default leaves;
