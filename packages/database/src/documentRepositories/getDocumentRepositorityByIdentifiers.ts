import type { SupabaseClient } from "../_shared/_types.ts";
import { mapDocumentRepository } from "./_mappers.ts";

export async function getDocumentRepositorityByIdentifiers(
  identifiers: string[],
  {
    abortSignal = new AbortController().signal,
    supabase,
  }: {
    abortSignal?: AbortSignal;
    supabase: SupabaseClient;
  },
) {
  const { data } = await supabase
    .from("databases")
    .select()
    .abortSignal(abortSignal)
    .in("config->>identifier", identifiers)
    .throwOnError();

  return data.map(mapDocumentRepository);
}
