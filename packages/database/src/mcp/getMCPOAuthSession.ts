import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only credential read. Caller must authenticate userId and authorize
 * the user's access to serverUrl through an agent before using a service client. */
export async function getMCPOAuthSession(
  userId: string,
  serverUrl: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("mcp_oauth_sessions")
    .select()
    .eq("user_id", userId)
    .eq("server_url", serverUrl)
    .maybeSingle();
  if (error) throw new Error("Could not load MCP connection");
  return data;
}
