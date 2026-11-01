import type { Task } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function addTask(
  document: YDoc,
  task: Extract<Task, { state: "pending" }>,
) {
  const tasks = document.getArray<Task>("tasks");

  document.transact(() => {
    tasks.push([{ ...task, state: "pending" }]);
  });
}
