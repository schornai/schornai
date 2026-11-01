import type { SupabaseClient } from "../_shared/_types.ts";
import { aiModelExternalLLMV1Schema } from "./_schema.ts";

/**
 * Server-only: caller must authorize a global administrator or a trusted worker
 * using the selected model. Never serialize the result into client props/logs.
 * Read the endpoint and secret in one snapshot, including during concurrent edits.
 */
export async function getExternalAIModelConnection(
  reference:
    { id: string; identifier?: never } | { identifier: string; id?: never },
  {
    supabase,
    abortSignal,
  }: { supabase: SupabaseClient; abortSignal?: AbortSignal },
) {
  try {
    let query = supabase
      .from("ai_models")
      .select("type, config, ai_model_credentials!inner(api_key)")
      .eq("type", "external_llm_v1");
    query =
      reference.id !== undefined
        ? query.eq("id", reference.id)
        : query.eq("identifier", reference.identifier);
    if (abortSignal) query = query.abortSignal(abortSignal);
    const { data, error } = await query.single();
    if (error || !data?.ai_model_credentials) throw new Error();
    const { config } = aiModelExternalLLMV1Schema.parse(data);
    return { config, apiKey: data.ai_model_credentials.api_key };
  } catch {
    throw new Error("MODEL_CREDENTIALS_UNAVAILABLE");
  }
}
