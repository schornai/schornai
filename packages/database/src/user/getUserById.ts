import type { SupabaseClient } from "../_shared/_types.ts";
import { mapUser } from "./_mapper.ts";

export async function getUserById(
  userId: string,
  {
    supabaseServiceRole,
  }: {
    supabaseServiceRole: SupabaseClient;
  },
) {
  const {
    data: { user: dbUser },
  } = await supabaseServiceRole.auth.admin.getUserById(userId);

  const { data: dbUserProfile } = await supabaseServiceRole
    .from("user_profiles")
    .select()
    .eq("id", userId)
    .maybeSingle()
    .throwOnError();

  if (!dbUser) {
    throw new Error("NOT_FOUND");
  }

  return mapUser(dbUser, dbUserProfile);
}
