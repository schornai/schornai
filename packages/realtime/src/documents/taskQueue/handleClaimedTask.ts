import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { Doc } from "yjs";
import type { Task } from "./_types.ts";
import { getTaskQueue } from "./getTaskQueue.ts";
import { requestTaskCoordinator } from "./requestTaskCoordinator.ts";
import { encodeTaskValue } from "./_taskCodec.ts";

export async function handleClaimedTask(
  document: Doc,
  provider: HocuspocusProvider,
  task: Extract<Task, { state: "claimed" }>,
  handler: (
    task: Extract<Task, { state: "claimed" }>,
    signal: AbortSignal,
  ) => Promise<Task["result"] | void>,
  workerSignal: AbortSignal,
) {
  if (!task.claimToken) throw new Error("TASK_CLAIM_MISSING");
  const owner = { taskId: task.id, token: task.claimToken };
  const lost = new AbortController();
  const cancelled = new AbortController();
  const { tasks, abortRequests } = getTaskQueue(document);
  const onClose = () => lost.abort(new Error("TASK_LEASE_LOST"));
  const onChange = () => {
    if (abortRequests.has(task.id)) cancelled.abort();
    const current = tasks.toArray().find((entry) => entry.id === task.id);
    if (
      current &&
      current.state !== "pending" &&
      (current.state !== "claimed" || current.claimToken !== task.claimToken)
    )
      onClose();
  };
  tasks.observe(onChange);
  abortRequests.observe(onChange);
  provider.on("close", onClose);
  provider.on("destroy", onClose);
  let renewing: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (renewing || lost.signal.aborted) return;
    renewing = requestTaskCoordinator(provider, { action: "renew", ...owner })
      .then(({ accepted }) => {
        if (!accepted) onClose();
      })
      .catch(onClose)
      .finally(() => {
        renewing = undefined;
      });
  }, 20_000);
  onChange();
  try {
    let result: Task["result"] | void;
    let error: string | undefined;
    try {
      const signal = AbortSignal.any([
        workerSignal,
        lost.signal,
        cancelled.signal,
      ]);
      signal.throwIfAborted();
      result = await handler(task, signal);
    } catch (caught) {
      error = workerSignal.aborted ? "TASK_WORKER_STOPPED" : String(caught);
    }
    if (lost.signal.aborted) return;
    // Keep the heartbeat alive until the handler has settled. A completion must
    // still pass the database owner/expiry check, even after a long handler.
    await requestTaskCoordinator(provider, {
      action: "finish",
      ...owner,
      result: result === undefined ? undefined : encodeTaskValue(result),
      error: cancelled.signal.aborted ? undefined : error,
    });
  } finally {
    clearInterval(timer);
    await renewing;
    tasks.unobserve(onChange);
    abortRequests.unobserve(onChange);
    provider.off("close", onClose);
    provider.off("destroy", onClose);
  }
}
