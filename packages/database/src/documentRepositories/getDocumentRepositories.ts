import type { SupabaseClient } from "../_shared/_types.ts";
import { mapDocumentRepositoryWithLegacySupportCleanUp } from "./_mappers.ts";

export async function getDocumentRepositories({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const { data } = await supabase
    .from("databases")
    .select()
    .order("name")
    .throwOnError();

  return await Promise.all(
    data.map((row) =>
      mapDocumentRepositoryWithLegacySupportCleanUp(row, { supabase }),
    ),
  );
}
