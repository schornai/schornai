import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import type { Doc as YDoc } from "yjs";

export function updateChatMessage(document: YDoc, message: ChatMessage) {
  const messages = document.getArray<ChatMessage>("messages");

  document.transact(() => {
    const messageIndex = messages
      .toArray()
      .findIndex((msg) => msg.id === message.id);

    if (messageIndex === -1) {
      messages.push([message]);
    } else {
      messages.delete(messageIndex, 1);
      messages.insert(messageIndex, [message]);
    }
  });
}
