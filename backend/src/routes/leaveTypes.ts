import { Hono } from "hono";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";
import { cacheService } from "../services/cacheService.js";

const leaveTypes = new Hono();

leaveTypes.get("/", authenticate, async (c) => {
  const user = c.get("user");

  const cachedTypes = await cacheService.getLeaveTypes(user.organization_id);
  if (cachedTypes && cachedTypes.length > 0) {
    return c.json({ leaveTypes: cachedTypes });
  }

  const { data: types, error } = await supabase
    .from("leave_types")
    .select("*")
    .eq("organization_id", user.organization_id)
    .order("name");

  if (error) {
    console.error("Error fetching leave types:", error);
    return c.json({ error: "Failed to fetch leave types" }, 500);
  }

  await cacheService.cacheLeaveTypes(user.organization_id, types || []);

  return c.json({ leaveTypes: types || [] });
});

leaveTypes.post("/", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const {
    name,
    color,
    requires_approval,
    max_days_per_year,
    carry_forward_allowed,
  } = await c.req.json();

  const { data: existing } = await supabase
    .from("leave_types")
    .select("id")
    .eq("organization_id", user.organization_id)
    .eq("name", name)
    .single();

  if (existing) {
    return c.json({ error: "Leave type with this name already exists" }, 400);
  }

  const { data: leaveType, error } = await supabase
    .from("leave_types")
    .insert({
      name,
      organization_id: user.organization_id,
      color: color || "#3B82F6",
      requires_approval: requires_approval !== false,
      max_days_per_year,
      carry_forward_allowed: carry_forward_allowed === true,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating leave type:", error);
    return c.json({ error: "Failed to create leave type" }, 500);
  }

  // Invalidate all caches affected by leave type changes
  await cacheService.invalidateOnLeaveTypesChange(user.organization_id);

  return c.json({ leaveType }, 201);
});

leaveTypes.put("/:id", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const leaveTypeId = c.req.param("id");
  const {
    name,
    color,
    requires_approval,
    max_days_per_year,
    carry_forward_allowed,
    is_active,
  } = await c.req.json();

  const { data: existing, error: fetchError } = await supabase
    .from("leave_types")
    .select("*")
    .eq("id", leaveTypeId)
    .eq("organization_id", user.organization_id)
    .single();

  if (fetchError || !existing) {
    return c.json({ error: "Leave type not found" }, 404);
  }

  if (name && name !== existing.name) {
    const { data: nameConflict } = await supabase
      .from("leave_types")
      .select("id")
      .eq("organization_id", user.organization_id)
      .eq("name", name)
      .neq("id", leaveTypeId)
      .single();

    if (nameConflict) {
      return c.json({ error: "Leave type with this name already exists" }, 400);
    }
  }

  const { data: leaveType, error } = await supabase
    .from("leave_types")
    .update({
      name: name || existing.name,
      color: color || existing.color,
      requires_approval:
        requires_approval !== undefined
          ? requires_approval
          : existing.requires_approval,
      max_days_per_year:
        max_days_per_year !== undefined
          ? max_days_per_year
          : existing.max_days_per_year,
      carry_forward_allowed:
        carry_forward_allowed !== undefined
          ? carry_forward_allowed
          : existing.carry_forward_allowed,
      is_active: is_active !== undefined ? is_active : existing.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveTypeId)
    .select()
    .single();

  if (error) {
    console.error("Error updating leave type:", error);
    return c.json({ error: "Failed to update leave type" }, 500);
  }

  await cacheService.invalidateOnLeaveTypesChange(user.organization_id);

  return c.json({ leaveType });
});

leaveTypes.delete("/:id", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const leaveTypeId = c.req.param("id");

  const { data: existing, error: fetchError } = await supabase
    .from("leave_types")
    .select("*")
    .eq("id", leaveTypeId)
    .eq("organization_id", user.organization_id)
    .single();

  if (fetchError || !existing) {
    return c.json({ error: "Leave type not found" }, 404);
  }

  const { data: requests } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("leave_type_id", leaveTypeId)
    .limit(1);

  if (requests && requests.length > 0) {
    return c.json(
      {
        error:
          "Cannot delete leave type with existing leave requests. Deactivate it instead.",
      },
      400
    );
  }

  const { error } = await supabase
    .from("leave_types")
    .delete()
    .eq("id", leaveTypeId);

  if (error) {
    console.error("Error deleting leave type:", error);
    return c.json({ error: "Failed to delete leave type" }, 500);
  }

  await cacheService.invalidateOnLeaveTypesChange(user.organization_id);

  return c.json({ message: "Leave type deleted successfully" });
});

leaveTypes.patch(
  "/:id/toggle-active",
  authenticate,
  requireAdmin,
  async (c) => {
    const user = c.get("user");
    const leaveTypeId = c.req.param("id");

    const { data: existing, error: fetchError } = await supabase
      .from("leave_types")
      .select("*")
      .eq("id", leaveTypeId)
      .eq("organization_id", user.organization_id)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: "Leave type not found" }, 404);
    }

    const { data: leaveType, error } = await supabase
      .from("leave_types")
      .update({
        is_active: !existing.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leaveTypeId)
      .select()
      .single();

    if (error) {
      console.error("Error updating leave type:", error);
      return c.json({ error: "Failed to update leave type" }, 500);
    }

    await cacheService.invalidateOnLeaveTypesChange(user.organization_id);

    return c.json({ leaveType });
  }
);

export default leaveTypes;
