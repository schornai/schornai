import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Authenticate an opaque MCP bearer token by its SHA-256 hash. */
export async function getGrant(
  hash: string,
  resource: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("platform_mcp_grants")
    .select("id,user_id,client_id,access_level,resource,redirect_uri")
    .eq("access_hash", hash)
    .eq("resource", resource)
    .gt("access_expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error("MCP_GRANT_LOOKUP_FAILED");
  return data;
}
