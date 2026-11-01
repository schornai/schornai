import type { Message } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function getChatCurrentMessageBatch(document: YDoc) {
  return document.getArray<Message>("batch");
}
