import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Token possession plus its public client identifier authorizes revocation. */
export async function revokeGrant(
  hash: string,
  clientId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("platform_mcp_grants")
    .delete()
    .eq("access_hash", hash)
    .eq("client_id", clientId);
  if (error) throw new Error("MCP_REVOCATION_FAILED");
}
