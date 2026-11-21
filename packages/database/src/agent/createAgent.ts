import { globalIdentifierSchema, identifierFromTitle } from "xrag/identifier";
import { nativeResourceId } from "xrag/identity";
import type { Agent } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Caller must authorize workspace-admin for the target and, when
 * copying retained credentials, the source workspace read from the saved agent. */
export async function createAgent(
  agent: Agent,
  {
    supabaseServiceRole,
    copyFrom,
    globalId,
  }: {
    supabaseServiceRole: SupabaseClient;
    globalId?: string;
    copyFrom?: { agentId: string; workspaceId: string };
  },
) {
  const agentId = crypto.randomUUID();
  const { description, name, workspaceId, id: _id, ...config } = agent;
  const originId =
    globalId === undefined
      ? identifierFromTitle(name)
      : globalIdentifierSchema.parse(globalId);
  const { error } = await supabaseServiceRole.rpc(
    "create_agent_with_identity",
    {
      p_agent_id: agentId,
      p_workspace_id: workspaceId,
      p_name: name,
      p_global_id: originId,
      p_fallback_global_id:
        globalId === undefined
          ? `${originId}-${nativeResourceId("agent", agentId).slice(0, 8)}`
          : undefined,
      p_description: description,
      p_config: config,
      p_copy_agent_id: copyFrom?.agentId,
      p_copy_workspace_id: copyFrom?.workspaceId,
    },
  );
  if (error?.message === "XRAG_IDENTITY_EXISTS")
    throw new Error("XRAG_IDENTITY_EXISTS");
  if (error) throw new Error("AGENT_SAVE_FAILED");
  return { agentId };
}
