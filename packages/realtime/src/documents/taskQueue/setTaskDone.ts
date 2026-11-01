import { getTaskQueue } from "./getTaskQueue.ts";
import type { Task } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function setTaskDone(
  document: YDoc,
  taskId: string,
  result: Task["result"],
) {
  const { tasks, abortRequests } = getTaskQueue(document);
  const taskIndex = tasks.toArray().findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return;
  }

  document.transact(() => {
    const oldTask = tasks.get(taskIndex);
    const requestedAt = abortRequests.get(taskId);
    if (
      oldTask.state !== "claimed" &&
      oldTask.state !== "aborting" &&
      !(oldTask.state === "pending" && requestedAt)
    )
      return;

    let completed: Task;
    if (oldTask.state === "aborting" || requestedAt) {
      completed = {
        ...oldTask,
        abortingAtISO:
          requestedAt ??
          (oldTask.state === "aborting"
            ? oldTask.abortingAtISO
            : new Date().toISOString()),
        abortedAtISO: new Date().toISOString(),
        state: "aborted",
      };
    } else if (oldTask.state === "claimed") {
      completed = {
        ...oldTask,
        finishedAtISO: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        result: result as any,
        state: "finished",
      };
    } else return;

    tasks.delete(taskIndex, 1);
    tasks.insert(taskIndex, [completed]);
  });
}
