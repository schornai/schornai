import type { Role } from "../workspace/_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

/** The caller must authorize a global admin before changing memberships. */
export async function updateUserPermission(
  {
    role,
    userId,
    workspaceId,
  }: { role: Role | "none"; userId: string; workspaceId: string },
  {
    supabaseServiceRole,
  }: {
    supabaseServiceRole: SupabaseClient;
  },
) {
  if (role === "none") {
    await supabaseServiceRole
      .from("user_roles")
      .delete()
      .eq("organization_id", workspaceId)
      .eq("user_id", userId)
      .throwOnError();
  } else {
    const { data } = await supabaseServiceRole
      .from("user_roles")
      .select()
      .eq("organization_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle()
      .throwOnError();

    if (data) {
      await supabaseServiceRole
        .from("user_roles")
        .update({
          role,
        })
        .eq("organization_id", workspaceId)
        .eq("user_id", userId)
        .throwOnError();
    } else {
      await supabaseServiceRole
        .from("user_roles")
        .insert({
          organization_id: workspaceId,
          role,
          user_id: userId,
        })
        .throwOnError();
    }
  }
}
