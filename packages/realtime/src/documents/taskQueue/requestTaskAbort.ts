import type { Doc } from "yjs";
import { getTaskQueue } from "./getTaskQueue.ts";

// Requesters never replace task entries: only the worker publishes completion.
// Concurrent completion and cancellation therefore cannot duplicate a task.
export function requestTaskAbort(document: Doc, taskId: string) {
  const { tasks, abortRequests } = getTaskQueue(document);
  const task = tasks.toArray().find((task) => task.id === taskId);
  if (!task || !["pending", "claimed", "aborting"].includes(task.state)) return;
  if (!abortRequests.has(taskId))
    abortRequests.set(taskId, new Date().toISOString());
}
