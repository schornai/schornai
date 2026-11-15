import type { SupabaseClient } from "../_shared/_types.ts";
import { mapAIModel } from "./_mappers.ts";

/** Resolve the runtime identifier exposed by mapAIModel, not the artifact identifier. */
export async function getAIModelByOllamaIdentifier(
  ollamaIdentifier: string,
  {
    abortSignal = new AbortController().signal,
    supabase,
  }: { abortSignal?: AbortSignal; supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("ai_models")
    .select()
    .abortSignal(abortSignal)
    .in("type", ["ollama_llm_v1", "ollama_embedding_v1"])
    .eq("config->>ollamaIdentifier", ollamaIdentifier)
    .single()
    .throwOnError();

  return mapAIModel(data);
}
