import { getTaskQueue } from "./getTaskQueue.ts";
import { setTaskDone } from "./setTaskDone.ts";
import type { Task } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { hasCapabilities } from "./_utils.ts";

export function claimTask(
  document: YDoc,
  workerIdentifier: string,
  type: Task["type"],
  capabilities: string[],
) {
  const { tasks, abortRequests } = getTaskQueue(document);
  for (const task of tasks.toArray()) {
    if (
      task.type === type &&
      task.state === "pending" &&
      abortRequests.has(task.id)
    )
      setTaskDone(document, task.id, undefined);
  }
  const taskIndex = tasks.toArray().findIndex(
    (task) =>
      task.state === "pending" &&
      task.type === type &&
      hasCapabilities({
        check: capabilities,
        required: task.requiredCapabilities,
      }),
  );

  if (taskIndex === -1) {
    return undefined;
  }

  document.transact(() => {
    const oldTask = tasks.get(taskIndex);

    tasks.delete(taskIndex, 1);
    tasks.insert(taskIndex, [
      {
        ...oldTask,
        claimedAtISO: new Date().toISOString(),
        claimedBy: workerIdentifier,
        state: "claimed",
      },
    ]);
  });

  const task = tasks.get(taskIndex);

  if (task?.state === "claimed") {
    return task;
  }

  return undefined;
}
