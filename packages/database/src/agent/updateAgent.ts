import type { Agent } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Caller must authorize workspace-admin for both the saved
 * expectedWorkspaceId and the requested target workspace before creating the client. */
export async function updateAgent(
  agent: Agent,
  {
    supabaseServiceRole,
    expectedWorkspaceId,
  }: {
    supabaseServiceRole: SupabaseClient;
    expectedWorkspaceId: string;
  },
) {
  const { description, name, workspaceId, id, ...config } = agent;
  const { error } = await supabaseServiceRole.rpc(
    "save_agent_with_mcp_credentials",
    {
      p_agent_id: id,
      p_workspace_id: workspaceId,
      p_name: name,
      p_description: description,
      p_config: config,
      p_expected_workspace_id: expectedWorkspaceId,
    },
  );
  if (error) throw new Error("AGENT_SAVE_FAILED");
}
