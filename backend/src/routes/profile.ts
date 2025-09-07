import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";

const profile = new Hono();

profile.delete("/", authenticate, async (c) => {
  const user = c.get("user");

  const { data: activeRequests } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .limit(1);

  if (activeRequests && activeRequests.length > 0) {
    return c.json(
      {
        error:
          "Cannot delete account with active leave requests. Please cancel or wait for them to be processed first.",
      },
      400
    );
  }

  const { error } = await supabase.from("users").delete().eq("id", user.id);

  if (error) {
    console.error("Error deleting user account:", error);
    return c.json({ error: "Failed to delete account" }, 500);
  }

  return c.json({ message: "Account deleted successfully" });
});

profile.put("/", authenticate, async (c) => {
  const user = c.get("user");
  const { name, phone, bio } = await c.req.json();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (bio !== undefined) updateData.bio = bio;

  const { data: updatedUser, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", user.id)
    .select(
      "id, email, name, role, organization_id, profile_picture, phone, bio"
    )
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }

  return c.json({ user: updatedUser });
});

export default profile;
