import type { SupabaseClient } from "../_shared/_types.ts";
import { mapAIModel } from "./_mappers.ts";

export async function getAIModelByIdentifier(
  aiModelIdentifier: string,
  {
    abortSignal = new AbortController().signal,
    supabase,
  }: { abortSignal?: AbortSignal; supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("ai_models")
    .select()
    .abortSignal(abortSignal)
    .eq("identifier", aiModelIdentifier)
    .single()
    .throwOnError();

  return mapAIModel(data);
}
