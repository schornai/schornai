import type { Message } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getChatCurrentMessageBatch } from "./getChatCurrentMessageBatch.ts";
import { normalizeChatCurrentMessage } from "./normalizeChatCurrentMessage.ts";

export function setChatCurrentMessageState(
  document: YDoc,
  messageId: Message["id"],
  state: Message["state"],
) {
  const batch = getChatCurrentMessageBatch(document);

  document.transact(() => {
    const batchArray = batch.toArray().map(normalizeChatCurrentMessage);
    const messagePrevIndex = batchArray.findIndex(
      (message) => message.id === messageId,
    );
    const messagePrev = batchArray[messagePrevIndex];

    if (messagePrev) {
      batch.delete(messagePrevIndex);
      batch.insert(messagePrevIndex, [
        {
          ...messagePrev,
          state,
        },
      ]);
    }
  });
}
