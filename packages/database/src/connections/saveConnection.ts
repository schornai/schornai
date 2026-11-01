import type { SupabaseClient } from "../_shared/_types.ts";
import type { ProviderConnection } from "./_types.ts";
/** Server-only. Caller must verify global administrator permission. */
export async function saveConnection(
  connection: Omit<ProviderConnection, "version">,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("provider_connections")
    .upsert({ ...connection, version: crypto.randomUUID() });
  if (error) throw new Error("Could not save provider connection");
}
