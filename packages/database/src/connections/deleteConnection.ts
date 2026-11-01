import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only. Caller must verify global administrator permission.
 * Existing agent references intentionally remain so missing configuration is visible. */
export async function deleteConnection(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("provider_connections")
    .delete()
    .eq("id", id);
  if (error) throw new Error("Could not remove provider connection");
}
