import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getChatCurrentMessageDocumentName({
  activityId,
  agentId,
}: {
  activityId: string;
  agentId: string;
}) {
  return `activity_chat_currentMessage___${activityId}_${agentId}` as DocumentName;
}
