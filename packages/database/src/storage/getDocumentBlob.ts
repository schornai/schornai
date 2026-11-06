import type { StorageSession } from "./_utils/StorageSession.ts";
import { inspect } from "./inspect.ts";
import { getFileTextBackup } from "./getFileTextBackup.ts";

export async function getDocumentBlob(
  path: string,
  storageSession: StorageSession,
) {
  const { storagePath } = storageSession.getStoragePath(path);
  const backup = await getFileTextBackup(storagePath, {
    storage: storageSession.supabaseStorage,
    signal: storageSession.abortSignal,
  });
  if (backup) return backup.blob;
  const target = await inspect(path, storageSession, { showAll: true });

  if (target?.file) {
    const { storagePath } = storageSession.getStoragePath(target.path);

    const { data, error } = await storageSession.supabaseStorage.download(
      storagePath,
      undefined,
      { signal: storageSession.abortSignal },
    );
    if (error) throw error;
    return data ?? undefined;
  }

  return undefined;
}
