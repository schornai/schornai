import type { StorageRealtimeObject } from "../storage/_types.ts";
import type { Doc as YDoc } from "yjs";
import { getChatCurrentMessageBatch } from "./getChatCurrentMessageBatch.ts";
import { normalizeChatCurrentMessage } from "./normalizeChatCurrentMessage.ts";

export function addChatCurrentMessageFiles(
  document: YDoc,
  messageId: string,
  files: StorageRealtimeObject[],
) {
  const batch = getChatCurrentMessageBatch(document);

  document.transact(() => {
    const batchArray = batch.toArray().map(normalizeChatCurrentMessage);
    const messagePrevIndex = batchArray.findIndex(
      (message) => message.id === messageId,
    );
    const messagePrev = batchArray[messagePrevIndex];

    if (messagePrev?.content.type === "text") {
      batch.delete(messagePrevIndex);
      batch.insert(messagePrevIndex, [
        {
          ...messagePrev,
          content: {
            ...messagePrev.content,
            files: [...(messagePrev.content.files ?? []), ...files],
          },
        },
      ]);
    }
  });
}
