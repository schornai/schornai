import type { Activity } from "./_types.ts";
import type { AppColor } from "@schornio/aibox-database/_shared/_types";
import type { DocumentName } from "../../_lib/DocumentName.ts";
import { getChatDocumentName } from "../chat/_utils.ts";
import { getReindexDocumentName } from "../reindex/_utils.ts";
import { getTranscribeDocumentName } from "../transcribe/_utils.ts";

export function getActivitiesDocumentName({ userId }: { userId: string }) {
  return `activity___${userId}` as DocumentName;
}

export function getActivityDocumentName(activity?: Activity) {
  switch (activity?.content?.type) {
    case "chat":
      return getChatDocumentName({
        activityId: activity.id,
        agentId: activity.content.chatbotId,
      });
    case "reindex":
      return getReindexDocumentName({ id: activity.id });
    case "transcription":
      return getTranscribeDocumentName({
        activityId: activity.id,
        transcriberId: activity.content.transcriberId,
      });
  }

  return undefined;
}

export function getActivityColor(
  activity: Activity,
  colors?: Map<string, AppColor>,
) {
  switch (activity.content?.type) {
    case "chat":
      return colors?.get(activity.content.chatbotId);
    case "transcription":
      return colors?.get(activity.content.transcriberId);
  }

  return undefined;
}
