import type { Task } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function setTaskError(document: YDoc, taskId: string, error: unknown) {
  const tasks = document.getArray<Task>("tasks");
  const taskIndex = tasks.toArray().findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return;
  }

  document.transact(() => {
    const oldTask = tasks.get(taskIndex);

    const message = String(error);
    const failedTask = (): Task => {
      switch (oldTask.state) {
        case "pending":
          return {
            ...oldTask,
            stateBeforeError: oldTask.state,
            error: message,
            state: "error",
          };
        case "claimed":
          return {
            ...oldTask,
            stateBeforeError: oldTask.state,
            error: message,
            state: "error",
          };
        case "finished":
          return {
            ...oldTask,
            stateBeforeError: oldTask.state,
            error: message,
            state: "error",
          };
        case "aborting":
          return {
            ...oldTask,
            stateBeforeError: oldTask.state,
            error: message,
            state: "error",
          };
        case "aborted":
          return {
            ...oldTask,
            stateBeforeError: oldTask.state,
            error: message,
            state: "error",
          };
        case "error":
          return { ...oldTask, error: message };
      }
    };
    tasks.delete(taskIndex, 1);
    tasks.insert(taskIndex, [failedTask()]);
  });
}
