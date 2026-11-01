import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getModelDoEmbedDocumentName({ id }: { id: string }) {
  return `model_do_embed__${id}` as DocumentName;
}
