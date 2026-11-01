import type { SupabaseClient } from "../_shared/_types.ts";
import type { ExternalModelProvider } from "./_schema.ts";
/** Server-only: caller must authorize an administrator. Blank keys retain the stored key. */
export async function updateExternalAIModel(
  input: {
    id: string;
    name: string;
    modelId: string;
    baseUrl: string;
    apiKey: string;
    provider: ExternalModelProvider;
    region?: string;
  },
  { supabase }: { supabase: SupabaseClient },
) {
  try {
    // Atomically retain or replace the key with the connection it belongs to.
    const { error } = await supabase.rpc("update_external_ai_model", {
      target_model_id: input.id,
      external_model_id: input.modelId,
      base_url: input.baseUrl,
      api_key: input.apiKey,
      provider: input.provider,
      ...(input.region ? { region: input.region } : {}),
    });
    if (error) throw new Error();
  } catch {
    throw new Error("MODEL_UPDATE_FAILED");
  }
}
