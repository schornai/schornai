import type { SupabaseClient } from "../_shared/_types.ts";
import type { SystemConfigKey } from "./_types.ts";

export async function getSystemConfig(
  key: SystemConfigKey,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("system_settings")
    .select()
    .eq("key", key)
    .maybeSingle()
    .throwOnError();

  return data?.value;
}
