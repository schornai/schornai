import type { Agent } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { z } from "zod/mini";

/** Server-only. Caller must first authorize access to the saved agent through a
 * user-scoped client and pass its selected role and MCP configuration. Never
 * return these headers to clients, model context, logs, or forwarded errors. */
export async function getAgentMCPHeaders(
  agentId: string,
  roleId: string,
  mcp: NonNullable<Agent["roles"][number]["mcps"]>[number],
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
): Promise<Record<string, string>> {
  const keys = Object.keys(mcp.headers);
  if (!keys.length) return {};
  const { data, error } = await supabaseServiceRole
    .from("agent_mcp_credentials")
    .select("headers")
    .eq("agent_id", agentId)
    .eq("role_id", roleId)
    .eq("mcp_id", mcp.id)
    .eq("url", mcp.url)
    .single();
  const parsed = z.record(z.string(), z.string()).safeParse(data?.headers);
  if (
    error ||
    !parsed.success ||
    keys.some((key) => !Object.hasOwn(parsed.data, key))
  )
    throw new Error("MCP_CREDENTIALS_UNAVAILABLE");
  return Object.fromEntries(keys.map((key) => [key, parsed.data[key]!]));
}
