import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import type { Task } from "./_types.ts";
import { addTask } from "./addTask.ts";
import { deleteTask } from "./deleteTask.ts";
import { getTaskQueue } from "./getTaskQueue.ts";
import { getTaskQueueDocumentName } from "./_utils.ts";
import { registerAbortTask } from "./registerAbortTask.ts";

export async function runTask<TTaskType extends Task["type"]>(
  type: TTaskType,
  parameters: Extract<Task, { type: TTaskType }>["parameters"],
  requiredCapabilities: string[],
  {
    abortSignal = new AbortController().signal,
    serverToken,
    websocketProvider,
  }: {
    abortSignal?: AbortSignal;
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
): Promise<Extract<Task, { type: TTaskType }>["result"]> {
  abortSignal.throwIfAborted();
  type TResult = Extract<Task, { type: TTaskType }>["result"];
  const taskPromise = Promise.withResolvers<TResult>();

  const taskId = crypto.randomUUID();

  await using taskQueue = new ServerRealtimeProvider({
    documentName: getTaskQueueDocumentName(),
    serverToken,
    websocketProvider,
  });
  await taskQueue.waitForSynced({ abortSignal });
  abortSignal.throwIfAborted();

  const { tasks } = getTaskQueue(taskQueue.document);
  const handler = () => {
    const task = tasks.toArray().find((task) => task.id === taskId);

    switch (task?.state) {
      case "aborted":
        taskPromise.reject(new DOMException(undefined, "AbortError"));
        break;
      case "error":
        taskPromise.reject();
        break;
      case "finished": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        taskPromise.resolve(task.result as any);
        deleteTask(taskQueue.document, task.id);
      }
    }
  };

  tasks.observe(handler);

  const { unregisterAbortTask } = registerAbortTask(
    taskQueue.document,
    taskId,
    abortSignal,
  );

  const onAbort = () => taskPromise.reject(abortSignal.reason);
  abortSignal.addEventListener("abort", onAbort, { once: true });
  if (abortSignal.aborted) onAbort();
  try {
    addTask(taskQueue.document, {
      id: taskId,
      parameters,
      requiredCapabilities,
      state: "pending",
      type,
    } as Extract<Task, { state: "pending"; type: TTaskType }>);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await taskPromise.promise) as any;
  } finally {
    tasks.unobserve(handler);
    abortSignal.removeEventListener("abort", onAbort);
    unregisterAbortTask();
  }
}
