import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getTranscribeDocumentName({
  activityId,
  transcriberId,
}: {
  activityId: string;
  transcriberId: string;
}) {
  return `activity_transcription__${activityId}_${transcriberId}` as DocumentName;
}
