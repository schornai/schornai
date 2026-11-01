import type { ChatCurrentMessageFile } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function setFileState(
  document: YDoc,
  update: { id: string; state: ChatCurrentMessageFile["state"] },
) {
  const files = document?.getArray<ChatCurrentMessageFile>("files");

  document?.transact(() => {
    const fileArray = files.toArray();
    const fileIndex = fileArray.findIndex((file) => file.id == update.id);
    const file = fileArray[fileIndex];

    if (file) {
      files.delete(fileIndex, 1);
      files.insert(fileIndex, [{ ...file, state: update.state }]);
    }
  });
}
