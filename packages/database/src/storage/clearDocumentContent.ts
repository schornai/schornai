import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import type { StorageRealtimeSession } from "./_types.ts";
import { getFileTextBackup } from "./getFileTextBackup.ts";

// A replacement download must not expose text extracted from an older file.
export async function clearDocumentContent(
  path: string,
  session: StorageRealtimeSession,
) {
  const { storagePath } = session.getStoragePath(path);
  if (
    await getFileTextBackup(storagePath, {
      storage: session.supabaseStorage,
      signal: session.abortSignal,
    })
  )
    throw new Error("TEXT_WRITE_RECOVERY_REQUIRED");
  session.abortSignal.throwIfAborted();
  const { error } = await session.supabaseStorage.remove([
    `${storagePath}${MDC_FILE_EXTENSION}`,
    `${storagePath}${TRANSCRIPT_FILE_EXTENSION}`,
  ]);
  if (error) throw error;
}
