import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getChatDocumentName({
  activityId,
  agentId,
}: {
  activityId: string;
  agentId: string;
}) {
  return `activity_chat___${activityId}_${agentId}` as DocumentName;
}
