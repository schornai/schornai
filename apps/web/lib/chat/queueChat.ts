import "server-only";
import type { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import type { UserClaims } from "@schornio/aibox-package-database/auth/_types";
import { getTaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/getTaskQueue";
import { addTask } from "@schornio/aibox-realtime/documents/taskQueue/addTask";
import { setChatState } from "@schornio/aibox-realtime/documents/chat/setChatState";

// Both normal submissions and OAuth resumptions use the same busy check and
// queue protocol. Callers authorize the user and sync these providers first.
export function assertChatIdle(
  { agentId, activityId }: { agentId: string; activityId: string },
  {
    chat,
    taskQueue,
  }: { chat: ServerRealtimeProvider; taskQueue: ServerRealtimeProvider },
) {
  if (
    chat.document.getMap("cancellations").size ||
    ["queued", "generating", "aborting"].includes(
      String(chat.document.getMap("state").get("type")),
    ) ||
    getTaskQueue(taskQueue.document)
      .tasks.toArray()
      .some(
        (task) =>
          task.type === "chat" &&
          task.parameters?.agentId === agentId &&
          task.parameters?.activityId === activityId &&
          ["pending", "claimed", "aborting"].includes(task.state),
      )
  )
    throw new Error("CHAT_BUSY");
}

export async function queueChat(
  parameters: {
    agentId: string;
    activityId: string;
    userId: string;
    userClaims: UserClaims;
  },
  {
    chat,
    taskQueue,
  }: { chat: ServerRealtimeProvider; taskQueue: ServerRealtimeProvider },
) {
  const generationId = crypto.randomUUID();
  setChatState(chat.document, { type: "queued", generationId });
  await chat.waitForSynced();
  addTask(taskQueue.document, {
    id: generationId,
    parameters,
    requiredCapabilities: [],
    state: "pending",
    type: "chat",
  });
  await taskQueue.waitForSynced();
}
