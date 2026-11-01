import type { SupabaseClient } from "../_shared/_types.ts";
import type { SystemConfigKey } from "./_types.ts";

export async function setSystemConfig(
  key: SystemConfigKey,
  value: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("system_settings")
    .select()
    .eq("key", key)
    .maybeSingle()
    .throwOnError();

  if (data) {
    await supabase
      .from("system_settings")
      .update({ value })
      .eq("key", key)
      .throwOnError();
  } else {
    await supabase
      .from("system_settings")
      .insert({ key, value })
      .throwOnError();
  }
}
