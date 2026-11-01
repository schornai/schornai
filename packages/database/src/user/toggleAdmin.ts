import type { SupabaseClient } from "../_shared/_types.ts";
import { getUserIsAdmin } from "./getUserIsAdmin.ts";

export async function toggleAdmin(
  toggle: "promoteToAdmin" | "demoteFromAdmin",
  userId: string,
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
) {
  const {
    data: { user },
    error,
  } = await supabaseServiceRole.auth.admin.getUserById(userId);

  if (error) throw error;
  if (!user) throw new Error("NOT_FOUND");
  if (user.is_sso_user || user.app_metadata.provider !== "email") {
    throw new Error("SSO_ROLES_MANAGED_BY_PROVIDER");
  }

  if (toggle === "promoteToAdmin") {
    if (await getUserIsAdmin(userId, { supabaseServiceRole })) return;

    await supabaseServiceRole
      .from("user_roles")
      .insert({
        role: "admin",
        user_id: userId,
      })
      .throwOnError();
  } else {
    await supabaseServiceRole
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin")
      .throwOnError();
  }
}
