import type { Doc as YDoc } from "yjs";
import { requestTaskAbort } from "./requestTaskAbort.ts";

export function registerAbortTask(
  document: YDoc,
  taskId: string,
  abortSignal: AbortSignal,
) {
  const unregisterAbortTask = () =>
    abortSignal.removeEventListener("abort", handle);
  const handle = () => {
    requestTaskAbort(document, taskId);
    unregisterAbortTask();
  };
  abortSignal.addEventListener("abort", handle, { once: true });
  if (abortSignal.aborted) handle();
  return { unregisterAbortTask };
}
