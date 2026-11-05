import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import type { StorageObject } from "./_types.ts";
import type { StorageRealtimeSession } from "./_types.ts";
import { inspect } from "./inspect.ts";
import { list } from "./list.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { removeFileIndex } from "./fileIndex.ts";
import { withStorageFileLock } from "./withStorageFileLock.ts";

type RemoveOptions = {
  supabase: SupabaseClient;
  // Check synchronized task state while holding the same lease as processing workers.
  beforeRemove: (path: string) => void;
};

async function removeFile(
  target: Extract<StorageObject, { file: true }>,
  storageSession: StorageRealtimeSession,
  { supabase, beforeRemove }: RemoveOptions,
) {
  const { storagePath } = storageSession.getStoragePath(target.path);
  try {
    await withStorageFileLock(
      storageSession.storage,
      target.path,
      supabase,
      storageSession.abortSignal,
      async (signal) => {
        beforeRemove(target.path);
        signal.throwIfAborted();
        // Stop on index errors: never report a deleted file whose text is searchable.
        // If object deletion fails, retrying this operation safely repeats the cleanup.
        await removeFileIndex(target.path, storageSession, supabase);
        signal.throwIfAborted();
        const { error } = await storageSession.supabaseStorage.remove([
          storagePath,
          `${storagePath}${MDC_FILE_EXTENSION}`,
          `${storagePath}${TRANSCRIPT_FILE_EXTENSION}`,
        ]);
        if (error) throw error;
        storageSession.logAction({ state: "removed", target });
      },
    );
  } catch (error) {
    storageSession.logAction({
      message: error instanceof Error ? error.message : String(error),
      state: "error",
      target,
    });
    throw error;
  }
}

async function removeFolder(
  path: string,
  storageSession: StorageRealtimeSession,
  options: RemoveOptions,
) {
  const storageObjects = await list(path, storageSession, { showAll: true });
  const removed = new Set<string>();
  for (const storageObject of storageObjects) {
    if (storageObject.file) {
      // Sidecars use their original's lock, including orphaned sidecars.
      const suffix = [MDC_FILE_EXTENSION, TRANSCRIPT_FILE_EXTENSION].find(
        (extension) => storageObject.path.endsWith(extension),
      );
      const path = suffix
        ? storageObject.path.slice(0, -suffix.length)
        : storageObject.path;
      if (removed.has(path)) continue;
      await removeFile(
        { ...storageObject, path, name: path.split("/").at(-1)! },
        storageSession,
        options,
      );
      removed.add(path);
    } else {
      await removeFolder(storageObject.path, storageSession, options);
      storageSession.logAction({ state: "removed", target: storageObject });
    }
  }
}

/** Caller must authorize write access. Each file and its index share one worker lease. */
export async function remove(
  path: string,
  storageSession: StorageRealtimeSession,
  options: RemoveOptions,
) {
  const storageObject = await inspect(path, storageSession);

  if (storageObject?.file) {
    await removeFile(storageObject, storageSession, options);
  }

  if (storageObject?.folder) {
    await removeFolder(path, storageSession, options);

    storageSession.logAction({ state: "removed", target: storageObject });
  }
}
