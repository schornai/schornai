import type { DocumentRepository } from "./_types.ts";
import { STORE_NAME } from "./_utils.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

export async function getDocumentBlob(
  path: string,
  documentRepository: Pick<DocumentRepository, "id" | "workspaceId">,
  {
    abortSignal,
    supabaseStorage,
  }: { abortSignal?: AbortSignal; supabaseStorage: SupabaseClient["storage"] },
) {
  const { data, error } = await supabaseStorage
    .from(STORE_NAME)
    .download(
      `${documentRepository.workspaceId ?? "not_set"}/${documentRepository.id}/${resolvePath(path)}`,
      undefined,
      { signal: abortSignal },
    );

  if (error) throw error;

  return data;
}
