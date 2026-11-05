import type { StorageFileObject, StorageRealtimeSession } from "./_types.ts";
import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { getFileTextBackup } from "./getFileTextBackup.ts";

export async function createFile(
  file: Blob | undefined = new Blob([]),
  path: string,
  storageSession: StorageRealtimeSession,
  { upsert = true }: { upsert?: boolean } = {},
) {
  const { storagePath } = storageSession.getStoragePath(path);
  if (
    await getFileTextBackup(storagePath, {
      storage: storageSession.supabaseStorage,
      signal: storageSession.abortSignal,
    })
  )
    throw new Error("TEXT_WRITE_RECOVERY_REQUIRED");

  storageSession.abortSignal?.throwIfAborted();
  const { error } = await storageSession.supabaseStorage.upload(
    storagePath,
    file,
    { upsert },
  );

  if (error) throw error;

  const nowISO = new Date().toISOString();
  const resolvedPath = resolvePath(path);

  const target: StorageFileObject = {
    createdAtISO: nowISO,
    file: true,
    name: resolvedPath.split("/").at(-1) ?? "",
    path: resolvedPath,
    readableContent: fileNeedsProcessing(path) === "text" ? "text" : undefined,
    size: file.size,
    type: file.type,
    updatedAtISO: nowISO,
  };

  storageSession.logAction({
    state: "created",
    target,
  });

  return target;
}
