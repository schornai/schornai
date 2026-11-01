import type { Message } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getChatCurrentMessageBatch } from "./getChatCurrentMessageBatch.ts";

export function addChatCurrentMessage(
  document: YDoc,
  messageContent: Message["content"],
) {
  const batch = getChatCurrentMessageBatch(document);
  const messageId = crypto.randomUUID();

  document.transact(() => {
    batch.push([
      {
        content: messageContent,
        id: messageId,
        state: "paused",
      },
    ]);
  });

  return { messageId };
}
