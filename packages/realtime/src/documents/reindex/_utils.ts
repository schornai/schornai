import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getReindexDocumentName({ id }: { id: string }) {
  return `index__${id}` as DocumentName;
}
