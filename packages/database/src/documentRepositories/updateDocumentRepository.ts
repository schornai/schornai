import type { DocumentRepository } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

export async function updateDocumentRepository(
  documentRepository: DocumentRepository,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  const { description, name, workspaceId, ...config } = documentRepository;

  await supabase
    .from("databases")
    .update({
      config,
      description,
      name,
      organization_id: workspaceId,
    })
    .eq("id", documentRepository.id)
    .throwOnError();
}
