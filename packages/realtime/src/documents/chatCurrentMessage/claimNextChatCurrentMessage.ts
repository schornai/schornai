import type { Doc as YDoc } from "yjs";
import { getChatCurrentMessageBatch } from "./getChatCurrentMessageBatch.ts";
import { normalizeChatCurrentMessage } from "./normalizeChatCurrentMessage.ts";

export function claimNextChatCurrentMessage(
  document: YDoc,
  { awaitingApproval = false }: { awaitingApproval?: boolean } = {},
) {
  const batchYArray = getChatCurrentMessageBatch(document);
  const batch = batchYArray.toArray().map(normalizeChatCurrentMessage);

  const nextIndex = batch.findIndex(
    ($) =>
      ($.state === "submitted" || $.state === "queued") &&
      (!awaitingApproval || $.content.type === "tool-approval"),
  );
  const next = batch[nextIndex];

  if (next) {
    document.transact(() => {
      batchYArray.delete(nextIndex);
    });
  }

  return next;
}
