import type { SupabaseClient } from "../_shared/_types.ts";
import { mapDocumentRepositoryWithLegacySupportCleanUp } from "./_mappers.ts";

export async function getDocumentRepositoryById(
  databaseId: string,
  {
    abortSignal = new AbortController().signal,
    supabase,
  }: { abortSignal?: AbortSignal; supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("databases")
    .select()
    .abortSignal(abortSignal)
    .eq("id", databaseId)
    .single()
    .throwOnError();

  return await mapDocumentRepositoryWithLegacySupportCleanUp(data, {
    supabase,
  });
}
