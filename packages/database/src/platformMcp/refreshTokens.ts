import type { SupabaseClient } from "../_shared/_types.ts";
import type { Database } from "../_shared/_supabase.ts";

/** Server-only. Rotates hashed credentials atomically; replay revokes the grant.
 * The RPC binds the client/resource/scope and checks grant expiry.
 * Every MCP invocation separately resolves the user's current permissions. */
export async function refreshTokens(
  input: Database["public"]["Functions"]["refresh_platform_mcp_tokens"]["Args"],
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase.rpc(
    "refresh_platform_mcp_tokens",
    input,
  );
  if (error) throw new Error("MCP_TOKEN_REFRESH_FAILED");
  return data;
}
