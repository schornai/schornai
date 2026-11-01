import type { AIModel } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getAIModels } from "./getAIModels.ts";

export async function getAIModelsByType<
  T extends AIModel,
  TType extends T["type"],
>(
  type: TType,
  { supabase }: { supabase: SupabaseClient },
): Promise<Extract<AIModel, { type: TType }>[]> {
  const models = await getAIModels({ supabase });
  return models.filter((model) => model.type === type) as Extract<
    AIModel,
    { type: TType }
  >[];
}
