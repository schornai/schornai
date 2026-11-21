import type { Task } from "./_types.ts";
import { getChatDocumentName } from "../chat/_utils.ts";

export function getTaskChatDocumentName(task: Task) {
  if (task.chat) return getChatDocumentName(task.chat);
  if (task.type === "chat") return getChatDocumentName(task.parameters);
  if (
    (task.type === "process-file" || task.type === "transcribe") &&
    task.parameters.storage.type === "activity"
  )
    return getChatDocumentName(task.parameters.storage);
  return undefined;
}
