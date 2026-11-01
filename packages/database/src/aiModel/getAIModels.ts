import type { SupabaseClient } from "../_shared/_types.ts";
import { mapAIModel } from "./_mappers.ts";

export async function getAIModels({ supabase }: { supabase: SupabaseClient }) {
  const { data: models } = await supabase
    .from("ai_models")
    .select()
    .throwOnError();

  return models.map(mapAIModel);
}
