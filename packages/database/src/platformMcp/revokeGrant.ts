import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Token possession plus its public client identifier authorizes revocation. */
export async function revokeGrant(
  hash: string,
  clientId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase.rpc("revoke_platform_mcp_grant", {
    p_token_hash: hash,
    p_client_id: clientId,
  });
  if (error) throw new Error("MCP_REVOCATION_FAILED");
}
