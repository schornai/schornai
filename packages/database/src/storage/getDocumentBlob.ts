import type { StorageSession } from "./_utils/StorageSession.ts";
import { inspect } from "./inspect.ts";

export async function getDocumentBlob(
  path: string,
  storageSession: StorageSession,
) {
  const target = await inspect(path, storageSession, { showAll: true });

  if (target?.file) {
    const { storagePath } = storageSession.getStoragePath(target.path);

    const { data } = await storageSession.supabaseStorage.download(
      storagePath,
      undefined,
      { signal: storageSession.abortSignal },
    );

    return data ?? undefined;
  }

  return undefined;
}
