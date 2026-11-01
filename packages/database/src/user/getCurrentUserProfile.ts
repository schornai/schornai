import type { SupabaseClient } from "../_shared/_types.ts";
import { getCurrentUser } from "./getCurrentUser.ts";
import { mapUser } from "./_mapper.ts";

export async function getCurrentUserProfile({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const currentUser = await getCurrentUser({ supabaseAuth: supabase.auth });

  const { data } = await supabase
    .from("user_profiles")
    .select()
    .eq("id", currentUser.id)
    .maybeSingle()
    .throwOnError();

  return mapUser(currentUser, data);
}
