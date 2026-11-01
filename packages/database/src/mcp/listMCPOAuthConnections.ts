import type { SupabaseClient } from "../_shared/_types";

/** Server-only. Caller must authenticate userId before using service role.
 * Only non-secret metadata may cross the server/client boundary. */
export async function listMCPOAuthConnections(
  userId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("mcp_oauth_sessions")
    .select("server_url")
    .eq("user_id", userId)
    .not("data->tokens", "is", null)
    .order("server_url");
  if (error) throw new Error("Unable to list MCP connections");
  return data;
}
