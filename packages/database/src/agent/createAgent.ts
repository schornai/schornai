import type { Agent } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Caller must authorize workspace-admin for the target and, when
 * copying retained credentials, the source workspace read from the saved agent. */
export async function createAgent(
  agent: Agent,
  {
    supabaseServiceRole,
    copyFrom,
  }: {
    supabaseServiceRole: SupabaseClient;
    copyFrom?: { agentId: string; workspaceId: string };
  },
) {
  const agentId = crypto.randomUUID();
  const { description, name, workspaceId, id: _id, ...config } = agent;
  const { error } = await supabaseServiceRole.rpc(
    "save_agent_with_mcp_credentials",
    {
      p_agent_id: agentId,
      p_workspace_id: workspaceId,
      p_name: name,
      p_description: description,
      p_config: config,
      p_copy_agent_id: copyFrom?.agentId,
      p_copy_workspace_id: copyFrom?.workspaceId,
    },
  );
  if (error) throw new Error("AGENT_SAVE_FAILED");
  return { agentId };
}
