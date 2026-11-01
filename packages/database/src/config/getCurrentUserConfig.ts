import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserConfigKey } from "./_types.ts";

export async function getCurrentUserConfig(
  key: UserConfigKey,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("settings_user")
    .select()
    .eq("key", key)
    .maybeSingle()
    .throwOnError();

  return data?.value;
}
