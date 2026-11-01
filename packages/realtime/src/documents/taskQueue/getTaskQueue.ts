import type { Task } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function getTaskQueue(document: YDoc) {
  const tasks = document.getArray<Task>("tasks");

  return {
    tasks,
    abortRequests: document.getMap<string>("abortRequests"),
  };
}
