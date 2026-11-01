import type { Message } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getChatCurrentMessageBatch } from "./getChatCurrentMessageBatch.ts";
import { normalizeChatCurrentMessage } from "./normalizeChatCurrentMessage.ts";

export function patchChatCurrentMessageBatch(
  document: YDoc,
  patch: Partial<Message>,
) {
  document.transact(() => {
    const batch = getChatCurrentMessageBatch(document);
    const batchArray = batch.toArray().map(normalizeChatCurrentMessage);
    const patchedBatchArray = batchArray.map((message) => ({
      ...message,
      ...patch,
    }));

    batch.delete(0, batch.length);
    batch.insert(0, patchedBatchArray);
  });
}
