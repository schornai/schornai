import type { StorageFileObject, StorageRealtimeSession } from "./_types.ts";
import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import { inspect } from "./inspect.ts";
import { listStorageRows } from "./_utils/listStorageRows.ts";
import { validateStoragePath } from "./validatePath.ts";

/** Copy the original and its sidecars before removing anything from the source. */
export async function transferFile(
  from: { path: string; storageSession: StorageRealtimeSession },
  to: { path: string; storageSession: StorageRealtimeSession },
  {
    move = false,
    beforeRemove,
  }: {
    move?: boolean;
    beforeRemove?: (target: StorageFileObject) => Promise<void>;
  } = {},
) {
  const pathFrom = validateStoragePath(from.path);
  const pathTo = validateStoragePath(to.path);
  const suffixes = ["", MDC_FILE_EXTENSION, TRANSCRIPT_FILE_EXTENSION];
  const sourceName = pathFrom.split("/").at(-1)!;
  const sourceFolder = from.storageSession.getStoragePath(
    pathFrom.split("/").slice(0, -1).join("/"),
  ).storagePath;
  const readVersions = async () => {
    const rows = await listStorageRows(
      sourceFolder,
      from.storageSession,
      sourceName,
    );
    return suffixes.map((suffix) => {
      const row = rows.find(
        (entry) => entry.name === sourceName + suffix && entry.metadata,
      );
      // Keep the raw timestamp precision and object ETag; UI dates lose precision.
      return row
        ? JSON.stringify([
            row.id,
            row.updated_at,
            row.metadata?.eTag,
            row.metadata?.size,
          ])
        : null;
    });
  };
  const sourceVersions = await readVersions();
  const source = await inspect(pathFrom, from.storageSession);
  if (!source?.file) throw new Error("FILE_NOT_FOUND");
  // Storage folders are prefixes: copying the object creates missing parents.
  // Check every ancestor so a file cannot become a folder in the destination.
  const parents = pathTo.split("/").slice(0, -1);
  for (let length = 1; length <= parents.length; length++) {
    const parent = parents.slice(0, length).join("/");
    if ((await inspect(parent, to.storageSession, { showAll: true }))?.file)
      throw new Error("TARGET_FOLDER_IS_FILE");
  }
  for (const suffix of suffixes) {
    if (await inspect(pathTo + suffix, to.storageSession, { showAll: true }))
      throw new Error("FILE_ALREADY_EXISTS");
  }
  const target: StorageFileObject = {
    ...source,
    path: pathTo,
    name: pathTo.split("/").at(-1)!,
    updatedAtISO: new Date().toISOString(),
  };
  const copied: string[] = [];
  const sources: string[] = [];
  try {
    for (const suffix of suffixes) {
      if (
        suffix &&
        !(
          await inspect(pathFrom + suffix, from.storageSession, {
            showAll: true,
          })
        )?.file
      )
        continue;
      from.storageSession.abortSignal.throwIfAborted();
      to.storageSession.abortSignal.throwIfAborted();
      const sourcePath = from.storageSession.getStoragePath(
        pathFrom + suffix,
      ).storagePath;
      const targetPath = to.storageSession.getStoragePath(
        pathTo + suffix,
      ).storagePath;
      const { error } = await from.storageSession.supabaseStorage.copy(
        sourcePath,
        targetPath,
        { destinationBucket: to.storageSession.storageName },
      );
      if (error) throw error;
      sources.push(sourcePath);
      copied.push(targetPath);
    }
    const currentVersions = await readVersions();
    if (currentVersions.some((value, index) => value !== sourceVersions[index]))
      throw new Error("SOURCE_CHANGED_DURING_COPY");
    await beforeRemove?.(target);
  } catch (error) {
    if (copied.length) {
      const { error: cleanupError } =
        await to.storageSession.supabaseStorage.remove(copied);
      if (cleanupError)
        throw new Error("COPY_FAILED_TARGET_CLEANUP_REQUIRED", {
          cause: error,
        });
    }
    throw error;
  }
  to.storageSession.logAction({ state: "created", target });
  if (move) {
    from.storageSession.abortSignal.throwIfAborted();
    const { error } = await from.storageSession.supabaseStorage.remove(sources);
    // The complete destination is retained if deleting the source fails.
    if (error) throw new Error("COPIED_SOURCE_DELETE_FAILED", { cause: error });
    from.storageSession.logAction({ state: "removed", target: source });
  }
  return target;
}
