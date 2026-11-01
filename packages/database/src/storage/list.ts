import { listStorageRows } from "./_utils/listStorageRows.ts";
import type { StorageSession } from "./_utils/StorageSession.ts";
import { toStorageObjectArray } from "./_utils/toStorageObjectArray.ts";

export async function list(
  path: string,
  storageSession: StorageSession,
  config?: {
    showAll?: boolean;
  },
) {
  const { resolvedPath, storagePath } = storageSession.getStoragePath(path);

  const data = await listStorageRows(storagePath, storageSession);

  return toStorageObjectArray(resolvedPath, data, config).toSorted((a, b) =>
    a.path.localeCompare(b.path),
  );
}
