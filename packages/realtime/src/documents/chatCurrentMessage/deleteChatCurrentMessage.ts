import type { Doc as YDoc } from "yjs";
import { getChatCurrentMessageBatch } from "./getChatCurrentMessageBatch.ts";

export function deleteChatCurrentMessage(document: YDoc, messageId: string) {
  const batch = getChatCurrentMessageBatch(document);

  document.transact(() => {
    const messageIndex = batch
      .toArray()
      .findIndex((message) => message.id === messageId);

    if (messageIndex >= 0) {
      batch.delete(messageIndex);
    }
  });
}
