import type { Agent } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

export async function updateAgent(
  agent: Agent,
  { supabase }: { supabase: SupabaseClient },
) {
  const { description, name, workspaceId, ...config } = agent;

  await supabase
    .from("chatbots")
    .update({
      config,
      description,
      name,
      organization_id: workspaceId,
      roles: {},
    })
    .eq("id", agent.id)
    .throwOnError();
}
