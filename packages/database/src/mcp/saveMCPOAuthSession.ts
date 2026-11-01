import type { SupabaseClient } from "../_shared/_types.ts";
import type { MCPOAuthSession } from "./_types.ts";
/** Server-only. Requires an authenticated, authorized user/server pair.
 * Compare-and-swap prevents stale refreshes and concurrent login attempts from
 * overwriting a newer token generation. Never forward raw database errors. */
export async function saveMCPOAuthSession(
  session: MCPOAuthSession,
  previousVersion: string | undefined,
  { supabase }: { supabase: SupabaseClient },
) {
  const next = { ...session, version: crypto.randomUUID() };
  const result = previousVersion
    ? await supabase
        .from("mcp_oauth_sessions")
        .update(next)
        .eq("user_id", session.user_id)
        .eq("server_url", session.server_url)
        .eq("version", previousVersion)
        .select()
        .maybeSingle()
    : await supabase.from("mcp_oauth_sessions").insert(next).select().single();
  if (result.error || !result.data)
    throw new Error("MCP connection changed. Please retry.");
  return result.data;
}
