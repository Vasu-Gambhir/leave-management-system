import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { requireMaster } from "../middleware/master.js";
import { supabase } from "../services/supabaseClient.js";

const master = new Hono();

// Get dashboard statistics
master.get("/stats", authenticate, requireMaster, async (c) => {
  try {
    // Get total organizations
    const { count: totalOrganizations } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true });

    // Get total users
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Get pending admin requests
    const { count: pendingRequests } = await supabase
      .from("admin_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString());

    // Get active organizations (with at least one user)
    const { data: activeOrgsData } = await supabase
      .from("organizations")
      .select("id")
      .gt("admin_count", 0);

    return c.json({
      totalOrganizations: totalOrganizations || 0,
      totalUsers: totalUsers || 0,
      pendingRequests: pendingRequests || 0,
      activeOrganizations: activeOrgsData?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching master stats:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});

// Get recent activity
master.get("/activity", authenticate, requireMaster, async (c) => {
  try {
    // Get recent organizations
    const { data: recentOrgs } = await supabase
      .from("organizations")
      .select("id, name, domain, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent admin requests
    const { data: recentRequests } = await supabase
      .from("admin_requests")
      .select(`
        id, requested_at, status,
        users!inner(name, email),
        organizations!inner(name, domain)
      `)
      .order("requested_at", { ascending: false })
      .limit(5);

    const activities: any[] = [];

    // Add organization activities
    if (recentOrgs) {
      recentOrgs.forEach(org => {
        activities.push({
          id: `org_${org.id}`,
          type: "org_created",
          message: `New organization "${org.name}" was created`,
          timestamp: org.created_at,
          organization: org.name
        });
      });
    }

    // Add admin request activities
    if (recentRequests) {
      recentRequests.forEach(req => {
        activities.push({
          id: `req_${req.id}`,
          type: "admin_request",
          message: `Admin access requested by ${req.users.name}`,
          timestamp: req.requested_at,
          organization: req.organizations.name
        });
      });
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({
      activities: activities.slice(0, 10) // Return latest 10 activities
    });
  } catch (error) {
    console.error("Error fetching master activity:", error);
    return c.json({ error: "Failed to fetch activity" }, 500);
  }
});

// Get all organizations
master.get("/organizations", authenticate, requireMaster, async (c) => {
  try {
    const { data: organizations, error } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        domain,
        admin_count,
        created_at,
        settings
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organizations:", error);
      return c.json({ error: "Failed to fetch organizations" }, 500);
    }

    // Get user count for each organization
    const orgsWithUserCount = await Promise.all(
      (organizations || []).map(async (org) => {
        const { count: userCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);

        return {
          ...org,
          user_count: userCount || 0
        };
      })
    );

    return c.json({
      organizations: orgsWithUserCount
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return c.json({ error: "Failed to fetch organizations" }, 500);
  }
});

// Delete organization (cascade delete users)
master.delete("/organizations/:orgId", authenticate, requireMaster, async (c) => {
  const orgId = c.req.param("orgId");

  try {
    // Get organization details before deletion
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, domain")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Delete organization (cascade delete will handle users, leaves, etc.)
    const { error: deleteError } = await supabase
      .from("organizations")
      .delete()
      .eq("id", orgId);

    if (deleteError) {
      console.error("Error deleting organization:", deleteError);
      return c.json({ error: "Failed to delete organization" }, 500);
    }

    return c.json({
      message: `Organization "${org.name}" and all associated data has been deleted successfully`
    });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return c.json({ error: "Failed to delete organization" }, 500);
  }
});

// Search users across all organizations
master.get("/users", authenticate, requireMaster, async (c) => {
  const searchQuery = c.req.query("search") || "";
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");

  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("users")
      .select(`
        id,
        email,
        name,
        role,
        profile_picture,
        created_at,
        organizations!inner(name, domain)
      `, { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    // Apply search filter if provided
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error("Error searching users:", error);
      return c.json({ error: "Failed to search users" }, 500);
    }

    return c.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return c.json({ error: "Failed to search users" }, 500);
  }
});

// Update user role directly (master override)
master.patch("/users/:userId/role", authenticate, requireMaster, async (c) => {
  const userId = c.req.param("userId");
  const { role } = await c.req.json();

  if (!["admin", "approval_manager", "team_member"].includes(role)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  try {
    const { data: user, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId)
      .select("name, email, role, organizations!inner(name)")
      .single();

    if (error) {
      console.error("Error updating user role:", error);
      return c.json({ error: "Failed to update user role" }, 500);
    }

    return c.json({
      message: `User role updated successfully`,
      user
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return c.json({ error: "Failed to update user role" }, 500);
  }
});

// Get all pending admin requests across organizations
master.get("/admin-requests", authenticate, requireMaster, async (c) => {
  try {
    const { data: requests, error } = await supabase
      .from("admin_requests")
      .select(`
        id,
        requested_at,
        expires_at,
        status,
        approval_token,
        users!inner(id, name, email),
        organizations!inner(id, name, domain)
      `)
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString())
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin requests:", error);
      return c.json({ error: "Failed to fetch admin requests" }, 500);
    }

    return c.json({
      requests: requests || []
    });
  } catch (error) {
    console.error("Error fetching admin requests:", error);
    return c.json({ error: "Failed to fetch admin requests" }, 500);
  }
});

export default master;