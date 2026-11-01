import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only. userId must come from the authenticated browser session.
 * One atomic update consumes a non-expired state exactly once, for its owner. */
export async function consumeMCPOAuthState(
  userId: string,
  state: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("mcp_oauth_sessions")
    .update({
      state: null,
      state_expires_at: null,
      version: crypto.randomUUID(),
    })
    .eq("user_id", userId)
    .eq("state", state)
    .gt("state_expires_at", new Date().toISOString())
    .select()
    .maybeSingle();
  if (error || !data) throw new Error("Invalid or expired MCP authorization");
  return data;
}
