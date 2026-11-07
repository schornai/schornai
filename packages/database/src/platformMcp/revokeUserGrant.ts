import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Caller authenticates userId. Both predicates are required even
 * with service role. Cascading deletion revokes every refresh-token generation. */
export async function revokeUserGrant(
  userId: string,
  grantId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("platform_mcp_grants")
    .delete()
    .eq("user_id", userId)
    .eq("id", grantId);
  if (error) throw new Error("MCP_GRANT_REVOCATION_FAILED");
}
