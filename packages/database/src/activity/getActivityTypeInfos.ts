import type { SupabaseClient } from "../_shared/_types.ts";
import { getAgents } from "../agent/getAgents.ts";
import { getTranscribers } from "../transcriber/getTranscribers.ts";

export async function getActivityTypeInfos({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const [agents, transcribers] = await Promise.all([
    getAgents({ supabase }),
    getTranscribers({ supabase }),
  ]);

  const colors = new Map([
    ...agents.map(
      (agent) =>
        [
          agent.id,
          {
            color: agent.color,
            icon: agent.icon,
            name: agent.name,
          },
        ] as const,
    ),
    ...transcribers.map(
      (transcriber) =>
        [
          transcriber.id,
          {
            color: transcriber.color,
            icon: transcriber.icon,
            name: transcriber.name,
          },
        ] as const,
    ),
  ]);

  return colors;
}
