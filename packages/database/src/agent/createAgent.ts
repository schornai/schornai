import type { Agent } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

export async function createAgent(
  agent: Agent,
  { supabase }: { supabase: SupabaseClient },
) {
  const id = crypto.randomUUID();
  const { description, name, workspaceId, ...config } = agent;

  await supabase
    .from("chatbots")
    .insert({
      config,
      description,
      id,
      name,
      organization_id: workspaceId,
      roles: {},
    })
    .throwOnError();

  return { agentId: id };
}
