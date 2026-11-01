import type { ChatCurrentMessageFile } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function setFileUrl(
  document: YDoc,
  update: { id: string; url: ChatCurrentMessageFile["url"] },
) {
  const files = document?.getArray<ChatCurrentMessageFile>("files");

  document?.transact(() => {
    const fileArray = files.toArray();
    const fileIndex = fileArray.findIndex((file) => file.id == update.id);
    const file = fileArray[fileIndex];

    if (file) {
      files.delete(fileIndex, 1);
      files.insert(fileIndex, [{ ...file, url: update.url }]);
    }
  });
}
