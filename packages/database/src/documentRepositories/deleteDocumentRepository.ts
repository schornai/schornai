import type { SupabaseClient } from "../_shared/_types.ts";

export async function deleteDocumentRepository(
  documentRepositoryId: string,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  await supabase
    .from("databases")
    .delete()
    .eq("id", documentRepositoryId)
    .throwOnError();
}
