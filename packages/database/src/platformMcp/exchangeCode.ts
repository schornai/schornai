import type { SupabaseClient } from "../_shared/_types.ts";
import type { Database } from "../_shared/_supabase.ts";

/** Server-only. All credential inputs are SHA-256 hashes; PKCE is S256 only. */
export async function exchangeCode(
  input: Database["public"]["Functions"]["exchange_platform_mcp_code"]["Args"],
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase.rpc(
    "exchange_platform_mcp_code",
    input,
  );
  if (error) throw new Error("MCP_TOKEN_EXCHANGE_FAILED");
  return data;
}
