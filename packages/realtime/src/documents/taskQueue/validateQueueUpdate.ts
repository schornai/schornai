import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import { isDeepStrictEqual } from "node:util";
import { getTaskQueue } from "./getTaskQueue.ts";

/** Producers append pending tasks, request cancellation, and consume terminal
 * results. Lifecycle replacement belongs exclusively to the coordinator. */
export function validateQueueUpdate(document: Doc, update: Uint8Array) {
  const candidate = new Doc();
  try {
    applyUpdate(candidate, encodeStateAsUpdate(document));
    applyUpdate(candidate, update);
    const before = getTaskQueue(document).tasks.toArray();
    const after = getTaskQueue(candidate).tasks.toArray();
    const original = new Map(before.map((task) => [task.id, task]));
    const resulting = new Map(after.map((task) => [task.id, task]));
    if (resulting.size !== after.length)
      throw new Error("TASK_COORDINATOR_REQUIRED");
    for (const task of after) {
      const previous = original.get(task.id);
      if (
        previous ? !isDeepStrictEqual(previous, task) : task.state !== "pending"
      )
        throw new Error("TASK_COORDINATOR_REQUIRED");
    }
    for (const task of before)
      if (
        !resulting.has(task.id) &&
        ["pending", "claimed", "aborting"].includes(task.state)
      )
        throw new Error("TASK_COORDINATOR_REQUIRED");
  } finally {
    candidate.destroy();
  }
}
