import type { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import type { TaskTypeChat } from "../taskQueue/_types.ts";
import { requestTaskCoordinator } from "../taskQueue/requestTaskCoordinator.ts";
export { assertChatIdle } from "./admitChatTask.ts";

export async function queueChat(
  parameters: TaskTypeChat["parameters"],
  {
    chat,
    abortSignal,
  }: {
    chat: ServerRealtimeProvider;
    taskQueue: ServerRealtimeProvider;
    abortSignal?: AbortSignal;
  },
) {
  abortSignal?.throwIfAborted();
  await chat.waitForSynced(abortSignal ? { abortSignal } : undefined);
  const response = await requestTaskCoordinator(
    chat.provider,
    { action: "enqueue-chat", parameters },
    abortSignal,
  );
  if (response.admission !== "accepted")
    throw new Error(response.admission ?? "TASK_COORDINATOR_UNAVAILABLE");
}
