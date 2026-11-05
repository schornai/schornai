import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import type { Task } from "./_types.ts";
import { requestTaskCoordinator } from "./requestTaskCoordinator.ts";
import { decodeTaskValue } from "./_taskCodec.ts";
import { handleClaimedTask } from "./handleClaimedTask.ts";
import { setTimeout as delay } from "node:timers/promises";
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
  #realtimeProvider: ServerRealtimeProvider;
  #taskType: TTaskType;
  #workerIdentifier: string;

  constructor(
    taskType: TTaskType,
    config: {
      capabilities:
        string[] | ((abortSignal: AbortSignal) => Promise<string[]>);
      capabilitiesChanged?: EventTarget;
      serverToken: ServerRealtimeProviderToken;
      websocketProvider?: ServerRealtimeWebsocketProvider;
      workerIdentifier: string;
    },
  ) {
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
    ) => Promise<TTask["result"] extends undefined ? void : TTask["result"]>,
    { abortSignal }: { abortSignal?: AbortSignal } = {},
  ) {
    const { tasks } = getTaskQueue(this.#realtimeProvider.document);
    const workerSignal = abortSignal ?? new AbortController().signal;
    let capabilitiesDirty = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1_000;
    let wake: (() => void) | undefined;
    const changed = () => {
      capabilitiesDirty = true;
      wake?.();
    };
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
            await handleClaimedTask(
              this.#realtimeProvider.document,
              this.#realtimeProvider.provider,
              claimedTask,
              (task, signal) =>
                handler(task as Extract<TTask, { state: "claimed" }>, signal),
              workerSignal,
            );
            continue;
          }
        } catch {
          if (workerSignal.aborted) break;
          // Reconnect or retry a failed coordinator/database request. No handler
          // starts without a durable ownership acknowledgement.
          await delay(1000, undefined, { signal: workerSignal }).catch(
            () => {},
          );
          continue;
        }

        await new Promise<void>((resolve) => {
          let retryClaim: ReturnType<typeof setTimeout> | undefined;
          const cleanup = () => {
            clearTimeout(retryClaim);
            wake = undefined;
            tasks.unobserve(handler);
            abortSignal?.removeEventListener("abort", onAbort);
          };
          const onAbort = () => {
            cleanup();
            resolve();
          };
          const handler = () => {
            if (
              tasks
                .toArray()
                .some(
                  (task) =>
                    task.type === this.#taskType &&
                    task.state === "pending" &&
                    task.requiredCapabilities.every((capability) =>
                      this.#capabilities.includes(capability),
                    ),
                )
            ) {
              resolve();
              cleanup();
            }
          };
          tasks.observe(handler);
          wake = onAbort;
          abortSignal?.addEventListener("abort", onAbort, { once: true });
          if (
            abortSignal?.aborted ||
            (capabilitiesDirty && this.#getCapabilities)
          )
            onAbort();
          else if (
            tasks
              .toArray()
              .some(
                (task) =>
                  task.type === this.#taskType &&
                  task.state === "pending" &&
                  task.requiredCapabilities.every((capability) =>
                    this.#capabilities.includes(capability),
                  ),
              )
          )
            retryClaim = setTimeout(onAbort, 1000);
        });
      }
    } finally {
      clearTimeout(retryTimer);
      this.#capabilitiesChanged?.removeEventListener("change", changed);
      this.#realtimeProvider.provider.destroy();
      this.#realtimeProvider.document.destroy();
    }
  }
}
