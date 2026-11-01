import type { SupabaseClient } from "../_shared/_types";

/** Server-only. Caller must authenticate userId before using service role.
 * Removes tokens and pending states. Stale provider writes fail their CAS. */
export async function deleteMCPOAuthConnection(
  userId: string,
  serverUrl: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("mcp_oauth_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("server_url", serverUrl);
  if (error) throw new Error("Unable to delete MCP connection");
}
