import type { SupabaseClient } from "../_shared/_types.ts";

export async function updateUserProfileName(
  userId: string,
  { firstName, lastName }: { firstName: string; lastName: string },
  {
    supabaseServiceRole,
  }: {
    supabaseServiceRole: SupabaseClient;
  },
) {
  await supabaseServiceRole
    .from("user_profiles")
    .upsert(
      {
        first_name: firstName,
        id: userId,
        last_name: lastName,
      },
      {
        onConflict: "id",
      },
    )
    .throwOnError();
}
