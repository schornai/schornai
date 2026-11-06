import type { Doc } from "yjs";
import type { Task } from "./_types.ts";
import { getTaskQueue } from "./getTaskQueue.ts";

/** Only the coordinator publishes lifecycle changes. Also folds legacy duplicates. */
export function replaceTask(document: Doc, task: Task) {
  const { tasks } = getTaskQueue(document);
  document.transact(() => {
    const indices = tasks
      .toArray()
      .flatMap((entry, index) => (entry.id === task.id ? [index] : []));
    for (const index of indices.toReversed()) tasks.delete(index, 1);
    tasks.insert(indices[0] ?? tasks.length, [task]);
  });
}
