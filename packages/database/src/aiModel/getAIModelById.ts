import type { SupabaseClient } from "../_shared/_types.ts";
import { mapAIModel } from "./_mappers.ts";

export async function getAIModelById(
  aiModelId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("ai_models")
    .select()
    .eq("id", aiModelId)
    .single()
    .throwOnError();

  return mapAIModel(data);
}
