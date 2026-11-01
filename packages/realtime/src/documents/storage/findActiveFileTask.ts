import type { Doc } from "yjs";
import type { Storage } from "@schornio/aibox-database/storage/_types";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { getTaskQueue } from "../taskQueue/getTaskQueue.ts";

export function findActiveFileTask(
  document: Doc,
  storage: Storage,
  path: string,
) {
  const bucket = StorageSession.getStorageName(storage.type);
  const target = StorageSession.getStoragePath(path, storage).storagePath;
  return getTaskQueue(document)
    .tasks.toArray()
    .find(
      (task) =>
        (task.type === "process-file" || task.type === "transcribe") &&
        ["pending", "claimed", "aborting"].includes(task.state) &&
        StorageSession.getStorageName(task.parameters.storage.type) ===
          bucket &&
        StorageSession.getStoragePath(
          task.parameters.path,
          task.parameters.storage,
        ).storagePath === target,
    );
}
