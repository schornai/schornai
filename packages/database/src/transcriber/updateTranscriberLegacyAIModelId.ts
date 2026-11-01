import type { SupabaseClient } from "../_shared/_types.ts";
import type { TranscriberConfig } from "./_types.ts";

export async function updateTranscriberLegacyAIModelId(
  transcriberId: string,
  newTranscriberConfig: TranscriberConfig,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  await supabase
    .from("transcribers")
    .update({
      ai_model_id: null,
      config: newTranscriberConfig,
    })
    .eq("id", transcriberId)
    .throwOnError();
}
