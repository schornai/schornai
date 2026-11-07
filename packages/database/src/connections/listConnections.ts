import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only. Caller must authenticate an agent editor or global admin.
 * The explicit projection never returns credentials. */
export async function listConnections({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("provider_connections")
    .select("id,name,kind,client_id,market,issuer")
    .order("name");
  if (error) throw new Error("Could not load provider connections");
  return data;
}
