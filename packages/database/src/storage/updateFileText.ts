import type { StorageRealtimeSession } from "./_types.ts";
import { inspect } from "./inspect.ts";
import { getDocumentContent } from "./getDocumentContent.ts";
import { saveDocumentContent } from "./saveDocumentContent.ts";
import { transcriptionToText } from "./transcriptionToText.ts";
import {
  MDC_FILE_EXTENSION,
  TEXT_WRITE_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import {
  encodeBlob,
  isTextFile,
  readStorageBlob,
  readTextWriteJournal,
  restoreTextWriteJournal,
  type TextWriteJournal,
} from "./_utils/textWriteRecovery.ts";
import { recoverFileText } from "./recoverFileText.ts";

// Caller must authorize write access and hold the file lock. Omit expectedText only for intentional overwrites.
export async function updateFileText(
  {
    path,
    text,
    expectedText,
  }: { path: string; text: string; expectedText?: string },
  { session }: { session: StorageRealtimeSession },
) {
  if (new TextEncoder().encode(text).byteLength > 1024 * 1024)
    throw new Error("TEXT_FILE_TOO_LARGE");
  try {
    await recoverFileText(path, session);
  } catch {
    return { status: "recoveryRequired" as const };
  }
  const file = await inspect(path, session);
  if (!file?.file) throw new Error("FILE_NOT_FOUND");
  const current = await getDocumentContent(path, session);
  if (!current) throw new Error("FILE_NOT_EDITABLE");
  const previous =
    current.type === "mdc" ? current.current : transcriptionToText(current);
  if (
    expectedText !== undefined &&
    previous !== expectedText &&
    previous !== text
  )
    return { status: "conflict" as const };
  const content =
    current.type === "mdc"
      ? { ...current, current: text }
      : { ...current, textOverride: text };
  if (isTextFile(path)) {
    const { storagePath } = session.getStoragePath(path);
    const storage = session.supabaseStorage;
    const signal = session.abortSignal;
    const original = await readStorageBlob(storagePath, storage, signal);
    if (!original) throw new Error("FILE_NOT_FOUND");
    const sidecar = await readStorageBlob(
      storagePath + MDC_FILE_EXTENSION,
      storage,
      signal,
    );
    const journal: TextWriteJournal = {
      version: 1,
      original: await encodeBlob(original),
      sidecar: sidecar ? await encodeBlob(sidecar) : null,
    };
    signal.throwIfAborted();
    const { error: backupError } = await storage.upload(
      storagePath + TEXT_WRITE_FILE_EXTENSION,
      JSON.stringify(journal),
      { upsert: false, contentType: "application/json" },
    );
    if (backupError) throw backupError;
    let written = false;
    try {
      // Readers and realtime clients must keep the previous version until commit.
      if (
        !(await saveDocumentContent(file, content, session, {
          withinTextWrite: true,
        }))
      )
        throw new Error("SAVE_FAILED");
      signal.throwIfAborted();
      const { error } = await storage.update(
        storagePath,
        new Blob([text], {
          type: file.type || "text/plain;charset=utf-8",
        }),
      );
      if (error) throw error;
      written = true;
      signal.throwIfAborted();
      const { error: commitError } = await storage.remove([
        storagePath + TEXT_WRITE_FILE_EXTENSION,
      ]);
      if (commitError) throw commitError;
    } catch (error) {
      try {
        const pending = await readTextWriteJournal(
          storagePath,
          storage,
          signal,
        );
        // A lost response to the final delete may still mean the write committed.
        if (!pending && written) {
          session.logAction({ state: "created", target: file, content });
          return { status: "saved" as const, file };
        }
        if (!pending) throw new Error("TEXT_WRITE_BACKUP_MISSING");
        await restoreTextWriteJournal(storagePath, pending, storage, signal);
      } catch {
        return { status: "recoveryRequired" as const };
      }
      throw error;
    }
    session.logAction({ state: "created", target: file, content });
  } else if (!(await saveDocumentContent(file, content, session))) {
    throw new Error("SAVE_FAILED");
  }
  return { status: "saved" as const, file };
}
