import type { SupabaseClient } from "../_shared/_types.ts";
import { mapAgentWithLegacySupportCleanUp } from "./_mappers.ts";

export async function getAgentsByIds(
  agentIds: string[],
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("chatbots")
    .select()
    .in("id", agentIds)
    .throwOnError();

  return await Promise.all(
    data.map((row) => mapAgentWithLegacySupportCleanUp(row, { supabase })),
  );
}
