import type { ChatCurrentMessageFile } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function removeFile(document: YDoc, fileId: string) {
  const files = document?.getArray<ChatCurrentMessageFile>("files");

  document?.transact(() => {
    const fileArray = files.toArray();
    const fileIndex = fileArray.findIndex((file) => file.id === fileId);
    files.delete(fileIndex, 1);
  });
}
