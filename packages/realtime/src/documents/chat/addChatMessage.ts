import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import type { Doc as YDoc } from "yjs";

export function addChatMessage(document: YDoc, message: ChatMessage) {
  const messages = document.getArray<ChatMessage>("messages");

  document.transact(() => {
    messages.push([message]);
  });
}
