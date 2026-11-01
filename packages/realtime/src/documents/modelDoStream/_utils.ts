import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getModelDoStreamDocumentName({ id }: { id: string }) {
  return `model_do_stream__${id}` as DocumentName;
}
