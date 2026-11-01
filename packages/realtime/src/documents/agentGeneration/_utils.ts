import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getAgentGenerationDocumentName({ id }: { id: string }) {
  return `agent_generate__${id}` as DocumentName;
}
