import { admitChatTask } from "../../packages/realtime/src/documents/chat/admitChatTask";
import type { queueChat } from "../../packages/realtime/src/documents/chat/queueChat";

// App tests use in-memory Yjs documents. The transport suite covers the real
// worker-authorized WebSocket command, including concurrent submissions.
export const queueChatInMemory: typeof queueChat = async (
  parameters,
  documents,
) => {
  await documents.chat.waitForSynced();
  documents.abortSignal?.throwIfAborted();
  const result = admitChatTask(parameters, documents);
  if (result !== "accepted") throw new Error(result);
};
