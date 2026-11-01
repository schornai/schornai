import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import type { StorageRealtimeSession } from "./_types.ts";

// A replacement download must not expose text extracted from an older file.
export async function clearDocumentContent(
  path: string,
  session: StorageRealtimeSession,
) {
  const { storagePath } = session.getStoragePath(path);
  session.abortSignal.throwIfAborted();
  const { error } = await session.supabaseStorage.remove([
    `${storagePath}${MDC_FILE_EXTENSION}`,
    `${storagePath}${TRANSCRIPT_FILE_EXTENSION}`,
  ]);
  if (error) throw error;
}
