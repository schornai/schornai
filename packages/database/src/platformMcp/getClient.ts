import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Public registration metadata; never contains client secrets. */
export async function getClient(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("platform_mcp_clients")
    .select("id,name,redirect_uris")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("MCP_CLIENT_LOOKUP_FAILED");
  return data;
}
