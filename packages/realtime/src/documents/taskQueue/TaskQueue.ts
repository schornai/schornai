import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import type { Task } from "./_types.ts";
import { claimTask } from "./claimTask.ts";
import { getTaskQueue } from "./getTaskQueue.ts";
import { getTaskQueueDocumentName } from "./_utils.ts";
import { setTaskDone } from "./setTaskDone.ts";
import { setTaskError } from "./setTaskError.ts";
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
    const { tasks, abortRequests } = getTaskQueue(
      this.#realtimeProvider.document,
    );
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
        const claimedTask = claimTask(
          this.#realtimeProvider.document,
          this.#workerIdentifier,
          this.#taskType,
          this.#capabilities,
        );

        if (claimedTask) {
          const abortController = new AbortController();
          const onAbort = () => {
            if (abortRequests.has(claimedTask.id)) abortController.abort();
            tasks.forEach((task) => {
              if (task.id === claimedTask.id && task.state === "aborting") {
                abortController.abort();
              }
            });
          };
          tasks.observe(onAbort);
          abortRequests.observe(onAbort);
          onAbort();
          try {
            const result = await handler(
              claimedTask as Extract<TTask, { state: "claimed" }>,
              abortSignal
                ? AbortSignal.any([abortSignal, abortController.signal])
                : abortController.signal,
            );
            setTaskDone(
              this.#realtimeProvider.document,
              claimedTask.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              result as any,
            );
          } catch (error) {
            if (abortController.signal.aborted) {
              setTaskDone(
                this.#realtimeProvider.document,
                claimedTask.id,
                undefined,
              );
            } else {
              setTaskError(
                this.#realtimeProvider.document,
                claimedTask.id,
                error,
              );
            }
          } finally {
            tasks.unobserve(onAbort);
            abortRequests.unobserve(onAbort);
          }
          continue;
        }

        await new Promise<void>((resolve) => {
          const cleanup = () => {
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
          else handler();
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
