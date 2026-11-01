import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import type { StorageObject } from "./_types.ts";
import type { StorageRealtimeSession } from "./_types.ts";
import { inspect } from "./inspect.ts";
import { list } from "./list.ts";

async function removeFile(
  target: Extract<StorageObject, { file: true }>,
  storageSession: StorageRealtimeSession,
) {
  const { storagePath } = storageSession.getStoragePath(target.path);

  storageSession.abortSignal?.throwIfAborted();
  const { error } = await storageSession.supabaseStorage.remove([
    storagePath,
    `${storagePath}${MDC_FILE_EXTENSION}`,
    `${storagePath}${TRANSCRIPT_FILE_EXTENSION}`,
  ]);
  if (error) {
    storageSession.logAction({
      message: error.message,
      state: "error",
      target,
    });
    throw error;
  }
  storageSession.logAction({ state: "removed", target });
}

async function removeFolder(
  path: string,
  storageSession: StorageRealtimeSession,
) {
  const storageObjects = await list(path, storageSession, { showAll: true });

  await Promise.all(
    storageObjects.map(async (storageObject) => {
      if (storageObject.file) {
        await removeFile(storageObject, storageSession);
      }

      if (storageObject.folder) {
        await removeFolder(storageObject.path, storageSession);

        storageSession.logAction({ state: "removed", target: storageObject });
      }
    }),
  );
}

export async function remove(
  path: string,
  storageSession: StorageRealtimeSession,
) {
  const storageObject = await inspect(path, storageSession);

  if (storageObject?.file) {
    await removeFile(storageObject, storageSession);
  }

  if (storageObject?.folder) {
    await removeFolder(path, storageSession);

    storageSession.logAction({ state: "removed", target: storageObject });
  }
}
