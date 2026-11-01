import type { ExternalModelProvider } from "./_schema.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only operation: callers must authorize an administrator before passing a service-role client. */
export async function createExternalAIModel(
  input: {
    name: string;
    modelId: string;
    baseUrl: string;
    apiKey: string;
    provider?: ExternalModelProvider;
    region?: string;
  },
  { supabase }: { supabase: SupabaseClient },
) {
  try {
    // Connection metadata and credentials must commit in one transaction.
    const { data: id, error } = await supabase.rpc("create_external_ai_model", {
      model_name: input.name,
      external_model_id: input.modelId,
      base_url: input.baseUrl,
      api_key: input.apiKey,
      provider: input.provider ?? "openai-compatible",
      ...(input.region ? { region: input.region } : {}),
    });
    if (error || !id) throw new Error();
    return id;
  } catch {
    // Database and transport errors can contain credentials. Never expose them.
    throw new Error("MODEL_CREATE_FAILED");
  }
}
