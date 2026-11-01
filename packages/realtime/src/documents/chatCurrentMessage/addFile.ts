import type { ChatCurrentMessageFile } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function addFile(document: YDoc, fileInfo: ChatCurrentMessageFile) {
  const files = document?.getArray<ChatCurrentMessageFile>("files");

  document?.transact(() => {
    files.push([fileInfo]);
  });
}
