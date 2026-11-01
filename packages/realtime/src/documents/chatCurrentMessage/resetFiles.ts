import type { ChatCurrentMessageFile } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function resetFiles(document: YDoc) {
  const files = document?.getArray<ChatCurrentMessageFile>("files");

  document.transact(() => {
    const filesLength = files.toArray().length;
    files.delete(0, filesLength);
  });
}
