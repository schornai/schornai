import { listStorageRows } from "./_utils/listStorageRows.ts";
import type { StorageObject } from "./_types.ts";
import type { StorageSession } from "./_utils/StorageSession.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { toStorageObjectArray } from "./_utils/toStorageObjectArray.ts";

export async function inspect(
  path: string,
  storageSession: StorageSession,
  config?: {
    showAll?: boolean;
  },
) {
  const resolvedPath = resolvePath(path);
  if (resolvedPath === "") {
    return {
      folder: true,
      name: "",
      path: resolvedPath,
    } satisfies StorageObject;
  }

  const pathSegments = path.split("/");
  const parent = pathSegments.slice(0, -1).join("/");
  const name = pathSegments.at(-1);

  const { resolvedPath: resolvedPathParent, storagePath } =
    storageSession.getStoragePath(parent);

  const data = await listStorageRows(storagePath, storageSession, name);

  return toStorageObjectArray(resolvedPathParent, data, config).find(
    (fileObject) => fileObject.name === name,
  );
}
