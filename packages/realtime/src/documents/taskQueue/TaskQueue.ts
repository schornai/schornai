import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import type { Doc } from "yjs";
import type { Task } from "./_types.ts";
import { requestTaskCoordinator } from "./requestTaskCoordinator.ts";
import { decodeTaskValue } from "./_taskCodec.ts";
import { handleClaimedTask } from "./handleClaimedTask.ts";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import { WorkerSlots } from "./WorkerSlots.ts";
import { getTaskQueue } from "./getTaskQueue.ts";
import { getTaskQueueDocumentName } from "./_utils.ts";
import type { ServerRealtimeProviderToken } from "../../_lib/PermissionManager.ts";

export class TaskQueue<
  TTaskType extends Task["type"],
  TTask extends Extract<Task, { type: TTaskType }>,
> {
  #capabilities: string[];
  #getCapabilities?: (abortSignal: AbortSignal) => Promise<string[]>;
  #capabilitiesChanged?: EventTarget;
  #concurrency: number;
  #realtimeProvider: ServerRealtimeProvider;
  #taskType: TTaskType;
  #workerIdentifier: string;

  constructor(
    taskType: TTaskType,
    config: {
      capabilities:
        string[] | ((abortSignal: AbortSignal) => Promise<string[]>);
      capabilitiesChanged?: EventTarget;
      concurrency?: number;
      serverToken: ServerRealtimeProviderToken;
      websocketProvider?: ServerRealtimeWebsocketProvider;
      workerIdentifier: string;
    },
  ) {
    this.#concurrency = config.concurrency ?? 1;
    if (!Number.isSafeInteger(this.#concurrency) || this.#concurrency < 1)
      throw new RangeError("Task concurrency must be a positive integer");
    this.#capabilities = Array.isArray(config.capabilities)
      ? config.capabilities
      : [];
    this.#getCapabilities =
      typeof config.capabilities === "function"
        ? config.capabilities
        : undefined;
    this.#capabilitiesChanged = config.capabilitiesChanged;
    this.#taskType = taskType;
    this.#realtimeProvider = new ServerRealtimeProvider({
      documentName: getTaskQueueDocumentName(),
      serverToken: config.serverToken,
      websocketProvider:
        config.websocketProvider ?? new ServerRealtimeWebsocketProvider(),
    });
    this.#workerIdentifier = config.workerIdentifier;
  }

  async handleTask(
    handler: (
      claimedTask: Extract<TTask, { state: "claimed" }>,
      abortSignal: AbortSignal,
      queueDocument: Doc,
      whileWaiting: WorkerSlots["whileWaiting"],
    ) => Promise<TTask["result"] extends undefined ? void : TTask["result"]>,
    { abortSignal }: { abortSignal?: AbortSignal } = {},
  ) {
    const { tasks } = getTaskQueue(this.#realtimeProvider.document);
    const workerSignal = abortSignal ?? new AbortController().signal;
    let capabilitiesDirty = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1_000;
    let wake: (() => void) | undefined;
    let backlogSince: number | undefined;
    const running = new Set<Promise<void>>();
    const slots = new WorkerSlots(this.#concurrency);
    const retryCoordinator = () =>
      delay(1000, undefined, { signal: workerSignal }).catch(() => {});
    const changed = () => {
      capabilitiesDirty = true;
      wake?.();
    };
    const nextPendingTask = () => {
      const pending = tasks
        .toArray()
        .find(
          (task) =>
            task.type === this.#taskType &&
            task.state === "pending" &&
            task.requiredCapabilities.every((capability) =>
              this.#capabilities.includes(capability),
            ),
        );
      backlogSince = pending ? (backlogSince ?? performance.now()) : undefined;
      return pending;
    };
    const onTasksChanged = () => {
      // A backlog can drain while a busy worker waits for a slot or a claim reply.
      if ((wake || backlogSince !== undefined) && nextPendingTask()) wake?.();
    };
    tasks.observe(onTasksChanged);
    const waitForWork = () =>
      new Promise<void>((resolve) => {
        let retryClaim: ReturnType<typeof setTimeout> | undefined;
        const resume = () => {
          clearTimeout(retryClaim);
          wake = undefined;
          workerSignal.removeEventListener("abort", resume);
          resolve();
        };
        wake = resume;
        workerSignal.addEventListener("abort", resume, { once: true });
        if (
          workerSignal.aborted ||
          (capabilitiesDirty && this.#getCapabilities)
        )
          resume();
        else if (nextPendingTask()) retryClaim = setTimeout(resume, 1000);
      });
    this.#capabilitiesChanged?.addEventListener("change", changed);
    try {
      while (!abortSignal?.aborted) {
        if (this.#getCapabilities && capabilitiesDirty) {
          capabilitiesDirty = false;
          clearTimeout(retryTimer);
          try {
            this.#capabilities = await this.#getCapabilities(workerSignal);
            retryDelay = 1_000;
          } catch {
            if (workerSignal.aborted) break;
            // Retry only failed discovery; successful snapshots have no timer.
            // Keep the last known capabilities during a temporary outage.
            retryTimer = setTimeout(changed, retryDelay);
            retryDelay = Math.min(30_000, retryDelay * 2);
          }
          if (workerSignal.aborted) break;
          if (capabilitiesDirty) continue;
        }
        try {
          await this.#realtimeProvider.waitForSynced({
            abortSignal: workerSignal,
          });
          if (slots.occupied === slots.capacity) {
            await once(slots, "release");
            continue;
          }
          if (slots.occupied > 0) {
            const candidate = nextPendingTask();
            if (!candidate) {
              await waitForWork();
              continue;
            }
            // Give less loaded peers a head start once per backlog. Short
            // completions must not restart the wait for already queued work.
            const remaining = Math.ceil(
              backlogSince! + slots.occupied * 250 - performance.now(),
            );
            if (remaining > 0) {
              const waitSignal = AbortSignal.any([
                workerSignal,
                AbortSignal.timeout(remaining),
              ]);
              try {
                await once(slots, "release", { signal: waitSignal });
                continue;
              } catch {
                if (workerSignal.aborted) break;
              }
            }
            if (
              (capabilitiesDirty && this.#getCapabilities) ||
              nextPendingTask()?.id !== candidate.id
            )
              continue;
          }
          if (!slots.tryAcquire()) continue;
          let handedToHandler = false;
          try {
            const response = await requestTaskCoordinator(
              this.#realtimeProvider.provider,
              {
                action: "claim",
                type: this.#taskType,
                capabilities: this.#capabilities,
                worker: this.#workerIdentifier,
              },
              workerSignal,
            );
            if (response.task) {
              const claimedTask = decodeTaskValue<
                Extract<TTask, { state: "claimed" }>
              >(response.task);
              const work = handleClaimedTask(
                this.#realtimeProvider.document,
                this.#realtimeProvider.provider,
                claimedTask,
                (task, signal) =>
                  handler(
                    task as Extract<TTask, { state: "claimed" }>,
                    signal,
                    this.#realtimeProvider.document,
                    (operation) => slots.whileWaiting(operation),
                  ),
                workerSignal,
              )
                .catch(retryCoordinator)
                .finally(() => {
                  running.delete(work);
                  slots.release();
                });
              running.add(work);
              handedToHandler = true;
              continue;
            }
          } finally {
            if (!handedToHandler) slots.release();
          }
        } catch {
          if (workerSignal.aborted) break;
          // Reconnect or retry a failed coordinator/database request. No handler
          // starts without a durable ownership acknowledgement.
          await retryCoordinator();
          continue;
        }

        await waitForWork();
      }
    } finally {
      tasks.unobserve(onTasksChanged);
      clearTimeout(retryTimer);
      this.#capabilitiesChanged?.removeEventListener("change", changed);
      await Promise.all(running);
      this.#realtimeProvider.provider.destroy();
      this.#realtimeProvider.document.destroy();
    }
  }
}
