import type { SupabaseClient } from "../_shared/_types.ts";
import { getAgentById } from "../agent/getAgentById.ts";
import { getConnectionCredentials } from "../connections/getConnectionCredentials.ts";
/** Server-only. Caller must authorize access to this saved agent/MCP first.
 * Resolve only the saved MCP reference and endpoint; OAuth apps are reusable
 * across endpoints configured by authorized agent editors. */
export async function getMCPOAuthClient(
  agentId: string,
  mcpId: string,
  serverUrl: string,
  options: { supabase: SupabaseClient },
) {
  const agent = await getAgentById(agentId, options);
  const mcp = agent.roles
    .flatMap((role) => role.mcps ?? [])
    .find((mcp) => mcp.id === mcpId && mcp.url === serverUrl);
  if (!mcp) throw new Error("MCP configuration unavailable");
  if (!mcp.oauthConnectionId) return null;
  const connection = await getConnectionCredentials(
    mcp.oauthConnectionId,
    options,
  );
  if (
    !connection ||
    connection.kind !== "oauth" ||
    !connection.client_id ||
    !connection.issuer ||
    !connection.secret?.trim()
  )
    throw new Error("MCP_OAUTH_CONNECTION_UNAVAILABLE");
  return {
    client_id: connection.client_id,
    issuer: connection.issuer,
    client_secret: connection.secret,
    version: connection.version,
  };
}
