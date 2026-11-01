import type { DocumentRepository } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

export async function createDocumentRepository(
  documentRepository: DocumentRepository,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  const id = crypto.randomUUID();

  const { description, name, workspaceId, ...config } = documentRepository;

  await supabase
    .from("databases")
    .insert({
      config,
      description,
      id,
      name,
      organization_id: workspaceId,
    })
    .throwOnError();

  return { documentRepositoryId: id };
}
