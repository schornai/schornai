import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";

export function getTypeId(content: Activity["content"]) {
  switch (content?.type) {
    case "chat":
      return content.chatbotId;
    case "transcription":
      return content.transcriberId;
    case "reindex":
    default:
      return "not-set";
  }
}
