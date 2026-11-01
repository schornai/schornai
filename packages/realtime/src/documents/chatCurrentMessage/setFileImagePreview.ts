import type { ChatCurrentMessageFile } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function setFileImagePreview(
  document: YDoc,
  update: { id: string; imagePreview: ChatCurrentMessageFile["imagePreview"] },
) {
  const files = document?.getArray<ChatCurrentMessageFile>("files");

  document?.transact(() => {
    const fileArray = files.toArray();
    const fileIndex = fileArray.findIndex((file) => file.id == update.id);
    const file = fileArray[fileIndex];

    if (file) {
      files.delete(fileIndex, 1);
      files.insert(fileIndex, [{ ...file, imagePreview: update.imagePreview }]);
    }
  });
}
