import type { SupabaseClient } from "../_shared/_types.ts";
import { getCurrentUser } from "./getCurrentUser.ts";

export async function deleteCurrentUserAvatar({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const currentUser = await getCurrentUser({ supabaseAuth: supabase.auth });

  await supabase
    .from("user_profiles")
    .upsert(
      {
        avatar_url: null,
        id: currentUser.id,
      },
      {
        onConflict: "id",
      },
    )
    .throwOnError();
}
