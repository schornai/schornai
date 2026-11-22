import type { Doc } from "yjs";
import type { Storage } from "@schornio/aibox-database/storage/_types";
import { findActiveFileTask, findFileTask } from "./findActiveFileTask.ts";
import { getTaskQueue } from "../taskQueue/getTaskQueue.ts";

/** Observe the upload's own job. Stopping the chat must leave that job running. */
export async function waitForFileProcessing(
  document: Doc,
  storage: Storage,
  path: string,
  signal: AbortSignal,
) {
  const { tasks } = getTaskQueue(document);
  const result = Promise.withResolvers<boolean>();
  let observed = false;
  const check = () => {
    const task =
      findActiveFileTask(document, storage, path) ??
      findFileTask(document, storage, path);
    if (task) observed = true;
    switch (task?.state) {
      case "pending":
      case "claimed":
        return;
      case "error":
      case "aborting":
      case "aborted":
        result.reject(new Error("CHAT_FILE_PROCESSING_FAILED"));
        return;
      default:
        result.resolve(observed);
    }
  };
  const onAbort = () =>
    result.reject(
      signal.reason?.name === "TimeoutError"
        ? new Error("CHAT_FILE_PROCESSING_TIMEOUT")
        : signal.reason,
    );
  tasks.observe(check);
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    if (signal.aborted) onAbort();
    else check();
    return await result.promise;
  } finally {
    tasks.unobserve(check);
    signal.removeEventListener("abort", onAbort);
  }
}
