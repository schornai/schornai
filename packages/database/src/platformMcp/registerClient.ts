import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Caller validates public-client metadata and redirect URIs. */
export async function registerClient(
  name: string,
  redirectUris: string[],
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("platform_mcp_clients")
    .insert({ name, redirect_uris: redirectUris })
    .select("id")
    .single();
  if (error) throw new Error("MCP_CLIENT_REGISTRATION_FAILED");
  return data.id;
}
