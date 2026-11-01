import "server-only";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";

export async function authorizeMCP(agentId: string, mcpId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  // User-scoped client enforces agent/workspace access through RLS.
  const agent = await getAgentById(agentId, { supabase });
  const mcp = agent.roles
    .flatMap((role) => role.mcps ?? [])
    .find((mcp) => mcp.id === mcpId);
  if (!mcp) throw new Error("MCP unavailable");
  const url = new URL(mcp.url);
  if (url.protocol !== "https:" || url.username || url.password || url.hash)
    throw new Error("OAuth requires an HTTPS MCP URL");
  return { user, mcp, agent };
}
