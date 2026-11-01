import type { SupabaseClient } from "../_shared/_types.ts";

export async function deleteUserAvatar(
  userId: string,
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
        avatar_url: null,
        id: userId,
      },
      {
        onConflict: "id",
      },
    )
    .throwOnError();
}
