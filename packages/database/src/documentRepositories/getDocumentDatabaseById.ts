import type { SupabaseClient } from "../_shared/_types.ts";
import { getAIModelsByType } from "../aiModel/getAIModelsByType.ts";
import { mapDocumentDatabaseRow } from "./_mappers.ts";

export async function getDocumentDatabaseById(
  databaseId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const [{ data }, embeddingModels] = await Promise.all([
    supabase
      .from("databases")
      .select()
      .eq("id", databaseId)
      .single()
      .throwOnError(),
    getAIModelsByType("ollama_embedding_v1", { supabase }),
  ]);

  return mapDocumentDatabaseRow(data, { embeddingModels });
}
