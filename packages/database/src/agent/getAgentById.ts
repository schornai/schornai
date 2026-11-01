import type { SupabaseClient } from "../_shared/_types.ts";
import { mapAgentWithLegacySupportCleanUp } from "./_mappers.ts";

export async function getAgentById(
  agentId: string,
  {
    abortSignal = new AbortController().signal,
    supabase,
  }: { abortSignal?: AbortSignal; supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("chatbots")
    .select()
    .abortSignal(abortSignal)
    .eq("id", agentId)
    .single()
    .throwOnError();

  return await mapAgentWithLegacySupportCleanUp(data, { supabase });
}
