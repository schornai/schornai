import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";

export function getTypeLink(content: Activity["content"]) {
  switch (content?.type) {
    case "chat":
      return `/agent/${content.chatbotId}`;
    case "transcription":
      return `/app/transcribe/${content.transcriberId}`;
    case "reindex":
    default:
      return "not-set";
  }
}
