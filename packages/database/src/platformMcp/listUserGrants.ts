import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Caller authenticates userId before using service role. Select
 * only public consent metadata; never expose hashes, challenges or tokens. */
export async function listUserGrants(
  userId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("platform_mcp_grants")
    .select(
      "id,access_level,resource,created_at,access_expires_at,refresh_expires_at,platform_mcp_clients!inner(name)",
    )
    .eq("user_id", userId)
    .not("access_hash", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("MCP_GRANTS_LIST_FAILED");
  return (data ?? []).map((grant) => ({
    id: grant.id,
    name: grant.platform_mcp_clients.name,
    level: grant.access_level,
    resource: grant.resource,
    createdAt: grant.created_at,
    expiresAt: grant.refresh_expires_at ?? grant.access_expires_at,
  }));
}
export type UserMcpGrant = Awaited<ReturnType<typeof listUserGrants>>[number];
