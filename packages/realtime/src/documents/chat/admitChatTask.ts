import type { Doc } from "yjs";
import type { TaskTypeChat } from "../taskQueue/_types.ts";
import { addTask } from "../taskQueue/addTask.ts";
import { getTaskQueue } from "../taskQueue/getTaskQueue.ts";
import { setChatState } from "./setChatState.ts";
import { getChat } from "./getChat.ts";
import { getChatInteraction } from "./getChatInteraction.ts";

type Documents = { chat: { document: Doc }; taskQueue: { document: Doc } };

export function assertChatIdle(
  { agentId, activityId }: { agentId: string; activityId: string },
  { chat, taskQueue }: Documents,
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

export function hasSubmittedVoice(
  {
    agentId,
    activityId,
  }: Pick<TaskTypeChat["parameters"], "agentId" | "activityId">,
  path: string,
  { chat, taskQueue }: Documents,
) {
  const messages = getChat(chat.document).messages?.toArray() ?? [];
  return (
    messages.some((message) =>
      message.parts.some(
        (part) => part.type === "data-voice" && part.data.path === path,
      ),
    ) ||
    getTaskQueue(taskQueue.document)
      .tasks.toArray()
      .some(
        (task) =>
          task.type === "chat" &&
          task.parameters.agentId === agentId &&
          task.parameters.activityId === activityId &&
          task.parameters.voice?.path === path &&
          ["pending", "claimed", "aborting"].includes(task.state),
      )
  );
}

/** Runs on the authoritative realtime documents, within the coordinator's serialized operation. */
export function admitChatTask(
  parameters: TaskTypeChat["parameters"],
  documents: Documents,
) {
  const { chat, taskQueue } = documents;
  if (
    parameters.voice &&
    hasSubmittedVoice(parameters, parameters.voice.path, documents)
  )
    return "accepted";
  try {
    assertChatIdle(parameters, documents);
  } catch {
    return "CHAT_BUSY";
  }
  if (
    parameters.voice &&
    getChatInteraction(getChat(chat.document).messages?.toArray() ?? [])
      .type === "tool-approval"
  )
    return "TOOL_APPROVAL_REQUIRED";
  const id = crypto.randomUUID();
  setChatState(chat.document, { type: "queued", generationId: id });
  addTask(taskQueue.document, {
    id,
    parameters,
    requiredCapabilities: [],
    state: "pending",
    type: "chat",
  });
  return "accepted";
}
