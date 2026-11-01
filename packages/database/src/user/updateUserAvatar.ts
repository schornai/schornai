import type { SupabaseClient } from "../_shared/_types.ts";

export async function updateUserAvatar(
  userId: string,
  { avatarUrl }: { avatarUrl: string },
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
        avatar_url: avatarUrl,
        id: userId,
      },
      {
        onConflict: "id",
      },
    )
    .throwOnError();
}
