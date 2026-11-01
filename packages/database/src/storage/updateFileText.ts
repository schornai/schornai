import type { StorageRealtimeSession } from "./_types.ts";
import { inspect } from "./inspect.ts";
import { getDocumentContent } from "./getDocumentContent.ts";
import { saveDocumentContent } from "./saveDocumentContent.ts";
import { transcriptionToText } from "./transcriptionToText.ts";
import { getFileCategory } from "@schornio/aibox-package-utils/getFileTypeLabel";

// Caller must authorize write access and hold the file lock.
export async function updateFileText(
  {
    path,
    text,
    expectedText,
  }: { path: string; text: string; expectedText: string },
  { session }: { session: StorageRealtimeSession },
) {
  if (new TextEncoder().encode(text).byteLength > 1024 * 1024)
    throw new Error("TEXT_FILE_TOO_LARGE");
  const file = await inspect(path, session);
  if (!file?.file) throw new Error("FILE_NOT_FOUND");
  const current = await getDocumentContent(path, session);
  if (!current) throw new Error("FILE_NOT_EDITABLE");
  const previous =
    current.type === "mdc" ? current.current : transcriptionToText(current);
  if (previous !== expectedText && previous !== text)
    return { status: "conflict" as const };
  const content =
    current.type === "mdc"
      ? { ...current, current: text }
      : { ...current, textOverride: text };
  if (!(await saveDocumentContent(file, content, session)))
    throw new Error("SAVE_FAILED");
  if (["plain-text", "code"].includes(getFileCategory(path))) {
    const { storagePath } = session.getStoragePath(path);
    const { error } = await session.supabaseStorage.update(
      storagePath,
      new Blob([text], { type: file.type || "text/plain;charset=utf-8" }),
    );
    if (error) throw error;
  }
  return { status: "saved" as const, file };
}
