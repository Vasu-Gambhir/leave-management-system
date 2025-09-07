import { supabase } from "./supabaseClient.js";

export async function updateAdminCount(organizationId: string): Promise<void> {
  try {
    const { count: adminCount, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "admin");

    if (countError) {
      console.error("Error counting admins:", countError);
      return;
    }

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ admin_count: adminCount || 0 })
      .eq("id", organizationId);

    if (updateError) {
      console.error("Error updating admin count:", updateError);
    }
  } catch (error) {
    console.error("Error in updateAdminCount:", error);
  }
}