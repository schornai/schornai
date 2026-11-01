import type { SupabaseClient } from "../_shared/_types.ts";
import { getCurrentUser } from "./getCurrentUser.ts";

export async function updateCurrentUserProfileName(
  { firstName, lastName }: { firstName: string; lastName: string },
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  const currentUser = await getCurrentUser({ supabaseAuth: supabase.auth });

  await supabase
    .from("user_profiles")
    .upsert(
      {
        first_name: firstName,
        id: currentUser.id,
        last_name: lastName,
      },
      {
        onConflict: "id",
      },
    )
    .throwOnError();
}
