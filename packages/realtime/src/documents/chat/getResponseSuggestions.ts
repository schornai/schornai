import type { ChatMessage } from "@schornio/aibox-database/chat/_types";

/** Only suggestions from the current assistant turn remain actionable. */
export function getResponseSuggestions(messages: ChatMessage[]): string[] {
  for (const message of messages.toReversed()) {
    if (message.role === "user") return [];
    if (message.role !== "assistant") continue;
    for (const part of message.parts.toReversed()) {
      if (
        part.type === "tool-chat-response-suggestions" &&
        part.state === "output-available" &&
        part.output.ok
      )
        return part.output.suggestions;
    }
  }
  return [];
}
