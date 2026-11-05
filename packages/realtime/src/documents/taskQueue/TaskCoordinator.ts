import type { Doc } from "yjs";
import type { Task } from "./_types.ts";
import type {
  TaskClaim,
  TaskClaimOptions,
} from "@schornio/aibox-database/task/_types";
import { claimBackgroundTask } from "@schornio/aibox-database/task/claimBackgroundTask";
import { renewBackgroundTask } from "@schornio/aibox-database/task/renewBackgroundTask";
import { finishBackgroundTask } from "@schornio/aibox-database/task/finishBackgroundTask";
import { expireBackgroundTasks } from "@schornio/aibox-database/task/expireBackgroundTasks";
import { getPendingTaskRecoveries } from "@schornio/aibox-database/task/getPendingTaskRecoveries";
import { completeTaskRecovery } from "@schornio/aibox-database/task/completeTaskRecovery";
import { getTaskClaims } from "@schornio/aibox-database/task/getTaskClaims";
import { pruneTaskClaimSnapshots } from "@schornio/aibox-database/task/pruneTaskClaimSnapshots";
import { getTaskQueue } from "./getTaskQueue.ts";
import { hasCapabilities } from "./_utils.ts";
import { encodeTaskValue, decodeTaskValue } from "./_taskCodec.ts";
import { replaceTask } from "./replaceTask.ts";
import { pruneTaskHistory } from "./pruneTaskHistory.ts";

type ClaimedTask = Extract<Task, { state: "claimed" }> & { claimToken: string };
export class TaskCoordinator {
  #pending = Promise.resolve();
  #legacySeenAt = new Map<string, number>();
  #nextCleanupAt = 0;
  readonly document: Doc;
  readonly options: TaskClaimOptions;
  readonly onInterrupted: (task: Task) => Promise<void>;
  constructor(
    document: Doc,
    options: TaskClaimOptions,
    onInterrupted: (task: Task) => Promise<void>,
  ) {
    this.document = document;
    this.options = options;
    this.onInterrupted = onInterrupted;
  }

  // Serializes this document's mutations. The database CAS also protects claims
  // across coordinators and restarts before the Yjs snapshot has been persisted.
  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#pending.then(operation);
    this.#pending = result.then(
      () => {},
      () => {},
    );
    return result;
  }
  async claim(
    type: Task["type"],
    capabilities: string[],
    worker: string,
  ): Promise<ClaimedTask | undefined> {
    const { tasks, abortRequests } = getTaskQueue(this.document);
    for (const task of tasks.toArray()) {
      if (
        task.state !== "pending" ||
        task.type !== type ||
        !hasCapabilities({
          check: capabilities,
          required: task.requiredCapabilities,
        })
      )
        continue;
      const claimed: ClaimedTask = {
        ...task,
        state: "claimed",
        claimedAtISO: new Date().toISOString(),
        claimedBy: worker,
        claimToken: crypto.randomUUID(),
      };
      const record = await claimBackgroundTask(
        task.id,
        claimed.claimToken,
        encodeTaskValue(claimed),
        this.options,
      );
      await this.apply(record, task);
      if (
        record.owner_token !== claimed.claimToken ||
        record.state !== "claimed"
      )
        continue;
      if (abortRequests.has(task.id)) {
        await this.finish(task.id, claimed.claimToken, undefined);
        continue;
      }
      return claimed;
    }
    return undefined;
  }
  async renew(taskId: string, token: string) {
    return renewBackgroundTask(taskId, token, this.options);
  }
  async finish(
    taskId: string,
    token: string,
    result: Task["result"],
    error?: string,
  ) {
    const [record] = await getTaskClaims([taskId], this.options);
    if (
      !record ||
      record.owner_token !== token ||
      record.state !== "claimed" ||
      !record.snapshot
    )
      return false;
    const task = decodeTaskValue<ClaimedTask>(record.snapshot);
    const requestedAt = getTaskQueue(this.document).abortRequests.get(taskId);
    const now = new Date().toISOString();
    const completed: Task = requestedAt
      ? {
          ...task,
          state: "aborted",
          abortingAtISO: requestedAt,
          abortedAtISO: now,
        }
      : error
        ? {
            ...task,
            state: "error",
            stateBeforeError: "claimed",
            error,
            finishedAtISO: now,
          }
        : ({ ...task, state: "finished", finishedAtISO: now, result } as Task);
    if (
      !(await finishBackgroundTask(
        taskId,
        token,
        completed.state as "finished" | "aborted" | "error",
        encodeTaskValue(completed),
        this.options,
      ))
    )
      return false;
    const [saved] = await getTaskClaims([taskId], this.options);
    if (saved) await this.apply(saved, completed);
    return true;
  }
  async apply(record: TaskClaim, fallback?: Task) {
    const original = record.snapshot
      ? decodeTaskValue<Task>(record.snapshot)
      : fallback;
    if (!original) return;
    let task = original;
    if (task.state !== record.state || !record.snapshot) {
      task = {
        ...original,
        state: "error",
        stateBeforeError:
          original.state === "error"
            ? original.stateBeforeError
            : original.state,
        error:
          record.state === "error"
            ? "TASK_WORKER_LOST"
            : "TASK_ALREADY_COMPLETED",
        finishedAtISO: record.completed_at ?? new Date().toISOString(),
      } as Task;
    }
    if (["finished", "aborted", "error"].includes(task.state)) {
      await this.onInterrupted(task);
      if (record.recovery_pending)
        await completeTaskRecovery(task.id, this.options);
    }
    const matches = getTaskQueue(this.document)
      .tasks.toArray()
      .filter((entry) => entry.id === task.id);
    const existing = matches[0];
    if (
      matches.length > 1 ||
      !existing ||
      existing.state !== task.state ||
      (existing.state === "claimed" &&
        existing.claimToken !== record.owner_token)
    )
      replaceTask(this.document, task);
  }
  async reconcile() {
    // Includes claims whose Yjs insertion was lost when the server exited.
    await expireBackgroundTasks(this.options);
    for (const record of await getPendingTaskRecoveries(this.options)) {
      try {
        await this.apply(record);
      } catch {
        // Keep the durable recovery flag for the next sweep, including orphans.
        console.error("TASK_RECOVERY_FAILED", { taskId: record.task_id });
      }
    }
    const active = getTaskQueue(this.document)
      .tasks.toArray()
      .filter((task) =>
        ["pending", "claimed", "aborting"].includes(task.state),
      );
    for (let offset = 0; offset < active.length; offset += 100) {
      const batch = active.slice(offset, offset + 100);
      const records = new Map(
        (
          await getTaskClaims(
            batch.map((task) => task.id),
            this.options,
          )
        ).map((record) => [record.task_id, record]),
      );
      for (const task of batch) {
        const record = records.get(task.id);
        if (record) await this.apply(record, task);
        else if (
          task.state === "pending" &&
          getTaskQueue(this.document).abortRequests.has(task.id)
        ) {
          const token = crypto.randomUUID();
          const claimed = {
            ...task,
            state: "claimed",
            claimedBy: "coordinator",
            claimedAtISO: new Date().toISOString(),
            claimToken: token,
          } as ClaimedTask;
          const saved = await claimBackgroundTask(
            task.id,
            token,
            encodeTaskValue(claimed),
            this.options,
          );
          if (saved.owner_token === token)
            await this.finish(task.id, token, undefined);
          else await this.apply(saved, task);
        } else if (task.state !== "pending") {
          // Old deployments have no durable owner. Do not replay possibly
          // completed external effects when upgrading their persisted tasks.
          const token = crypto.randomUUID();
          const saved = await claimBackgroundTask(
            task.id,
            token,
            encodeTaskValue(task),
            this.options,
          );
          if (saved.owner_token === token) {
            const failed = {
              ...task,
              state: "error",
              stateBeforeError: task.state,
              error: "TASK_WORKER_LOST",
              finishedAtISO: new Date().toISOString(),
            } as Task;
            await finishBackgroundTask(
              task.id,
              token,
              "error",
              encodeTaskValue(failed),
              this.options,
            );
          }
          const [current] = await getTaskClaims([task.id], this.options);
          if (current) await this.apply(current, task);
        }
      }
    }
    // Apply a grace period before pruning replicated results. Cleanup remains
    // periodic even when no more work arrives, without touching active tasks.
    if (Date.now() >= this.#nextCleanupAt) {
      pruneTaskHistory(this.document, this.#legacySeenAt);
      await pruneTaskClaimSnapshots(this.options);
      this.#nextCleanupAt = Date.now() + 60_000;
    }
  }
}
