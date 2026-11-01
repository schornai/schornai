import type { SupabaseClient } from "../_shared/_types.ts";
import type { SystemConfigKey } from "./_types.ts";

/**
 * Writes related configuration values atomically in one upsert statement.
 * Privileged callers must authorize a global administrator before passing a
 * service-role client; the client itself does not establish authorization.
 */
export async function setSystemConfigs(
  values: Partial<Record<SystemConfigKey, string>>,
  { supabase }: { supabase: SupabaseClient },
) {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
  if (rows.length === 0) return;
  await supabase
    .from("system_settings")
    .upsert(rows, { onConflict: "key" })
    .throwOnError();
}
