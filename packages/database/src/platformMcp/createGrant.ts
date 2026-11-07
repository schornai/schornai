import type { SupabaseClient } from "../_shared/_types.ts";
import type { Database } from "../_shared/_supabase.ts";

/** Server-only. Caller must authenticate the user, validate registered redirect,
 * resource and PKCE, and obtain explicit consent for this exact access level. */
export async function createGrant(
  grant: Database["public"]["Tables"]["platform_mcp_grants"]["Insert"],
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase.from("platform_mcp_grants").insert(grant);
  if (error) throw new Error("MCP_GRANT_FAILED");
}
