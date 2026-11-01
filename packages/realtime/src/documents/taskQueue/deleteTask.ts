import type { Task } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function deleteTask(document: YDoc, taskId: string) {
  const tasks = document.getArray<Task>("tasks");
  const taskIndex = tasks.toArray().findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return;
  }

  document.transact(() => {
    tasks.delete(taskIndex, 1);
    document.getMap("abortRequests").delete(taskId);
  });
}
