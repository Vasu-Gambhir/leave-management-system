import { Hono } from "hono";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";

const organizations = new Hono();

// Get organization details
organizations.get("/", authenticate, async (c) => {
  const user = c.get("user");

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", user.organization_id)
    .single();

  if (error) {
    console.error("Error fetching organization:", error);
    return c.json({ error: "Failed to fetch organization" }, 500);
  }

  return c.json({ organization });
});

// Update organization settings (Admin only)
organizations.put("/settings", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const { name, settings } = await c.req.json();

  const updateData: any = {};
  if (name) updateData.name = name;
  if (settings) updateData.settings = settings;
  updateData.updated_at = new Date().toISOString();

  const { data: organization, error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", user.organization_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating organization:", error);
    return c.json({ error: "Failed to update organization" }, 500);
  }

  return c.json({ organization });
});

// Get organization users (Admin only)
organizations.get("/users", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const {
    data: users,
    error,
    count,
  } = await supabase
    .from("users")
    .select("id, email, name, role, profile_picture, created_at", {
      count: "exact",
    })
    .eq("organization_id", user.organization_id)
    .order("name")
    .range(from, to);

  if (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }

  return c.json({
    users,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
});

// Update user role (Admin only)
organizations.patch(
  "/users/:userId/role",
  authenticate,
  requireAdmin,
  async (c) => {
    const user = c.get("user");
    const userId = c.req.param("userId");
    const { role } = await c.req.json();

    if (!["admin", "approval_manager", "team_member"].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }

    // Can't change own role to prevent lockout
    if (userId === user.id) {
      return c.json({ error: "Cannot change your own role" }, 400);
    }

    // Check if user belongs to the same organization
    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .eq("organization_id", user.organization_id)
      .single();

    if (fetchError || !targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, name, role, profile_picture, created_at")
      .single();

    if (error) {
      console.error("Error updating user role:", error);
      return c.json({ error: "Failed to update user role" }, 500);
    }

    return c.json({ user: updatedUser });
  }
);

// Remove user from organization (Admin only)
organizations.delete(
  "/users/:userId",
  authenticate,
  requireAdmin,
  async (c) => {
    const user = c.get("user");
    const userId = c.req.param("userId");

    // Can't delete own account
    if (userId === user.id) {
      return c.json({ error: "Cannot delete your own account" }, 400);
    }

    // Check if user belongs to the same organization
    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("organization_id", user.organization_id)
      .single();

    if (fetchError || !targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if user has any pending or approved leave requests
    const { data: activeRequests } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending", "approved"])
      .limit(1);

    if (activeRequests && activeRequests.length > 0) {
      return c.json(
        {
          error:
            "Cannot delete user with active leave requests. Please handle their requests first.",
        },
        400
      );
    }

    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) {
      console.error("Error deleting user:", error);
      return c.json({ error: "Failed to delete user" }, 500);
    }

    return c.json({ message: "User deleted successfully" });
  }
);

// Get organization analytics (Admin only)
organizations.get("/analytics", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  // Get total users
  const { count: totalUsers } = await supabase
    .from("users")
    .select("id", { count: "exact" })
    .eq("organization_id", user.organization_id);

  // Get leave requests stats
  let leaveQuery = supabase
    .from("leave_requests")
    .select(
      `
      id,
      status,
      start_date,
      end_date,
      users!inner(organization_id)
    `
    )
    .eq("users.organization_id", user.organization_id);

  if (startDate && endDate) {
    leaveQuery = leaveQuery
      .gte("start_date", startDate)
      .lte("end_date", endDate);
  }

  const { data: leaveRequests, error: leaveError } = await leaveQuery;

  if (leaveError) {
    console.error("Error fetching leave analytics:", leaveError);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }

  const analytics = {
    totalUsers: totalUsers || 0,
    leaveRequests: {
      total: leaveRequests?.length || 0,
      pending: leaveRequests?.filter((r) => r.status === "pending").length || 0,
      approved:
        leaveRequests?.filter((r) => r.status === "approved").length || 0,
      rejected:
        leaveRequests?.filter((r) => r.status === "rejected").length || 0,
      cancelled:
        leaveRequests?.filter((r) => r.status === "cancelled").length || 0,
    },
  };

  return c.json({ analytics });
});

export default organizations;
