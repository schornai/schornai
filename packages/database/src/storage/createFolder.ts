import { EMPTY_FOLDER_PLACEHOLDER } from "./_utils/toStorageObjectArray.ts";
import type { StorageRealtimeSession } from "./_types.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

export async function createFolder(
  path: string,
  storageSession: StorageRealtimeSession,
) {
  const { storagePath } = storageSession.getStoragePath(
    `${path}/${EMPTY_FOLDER_PLACEHOLDER}`,
  );

  storageSession.abortSignal?.throwIfAborted();
  const { error } = await storageSession.supabaseStorage.upload(
    storagePath,
    new Blob([]),
    { upsert: true },
  );

  if (error) throw error;

  const resolvedPath = resolvePath(path);
  storageSession.logAction({
    state: "created",
    target: {
      folder: true,
      name: resolvedPath.split("/").at(-1) ?? "",
      path: resolvedPath,
    },
  });
}
