import type { Doc } from "yjs";
import type { Storage } from "@schornio/aibox-database/storage/_types";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { getTaskQueue } from "../taskQueue/getTaskQueue.ts";

export function findFileTask(
  document: Doc,
  storage: Storage,
  path: string,
  { activeOnly = false } = {},
) {
  const bucket = StorageSession.getStorageName(storage.type);
  const target = StorageSession.getStoragePath(path, storage).storagePath;
  return getTaskQueue(document)
    .tasks.toArray()
    .findLast(
      (task) =>
        (task.type === "process-file" || task.type === "transcribe") &&
        (!activeOnly ||
          ["pending", "claimed", "aborting"].includes(task.state)) &&
        StorageSession.getStorageName(task.parameters.storage.type) ===
          bucket &&
        StorageSession.getStoragePath(
          task.parameters.path,
          task.parameters.storage,
        ).storagePath === target,
    );
}

export function findActiveFileTask(
  document: Doc,
  storage: Storage,
  path: string,
) {
  return findFileTask(document, storage, path, { activeOnly: true });
}
