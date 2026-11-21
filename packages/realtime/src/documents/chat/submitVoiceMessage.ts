import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { z } from "zod";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { UserClaims } from "@schornio/aibox-database/auth/_types";
import { voiceMessageSchema } from "@schornio/aibox-database/chat/voiceMessage";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { requirePlatformAccess } from "@schornio/aibox-database/mcp/platformAccess";
import { requireStorageAccess } from "@schornio/aibox-database/storage/requireStorageAccess";
import { validateStoragePath } from "@schornio/aibox-database/storage/validatePath";
import { inspect } from "@schornio/aibox-database/storage/inspect";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import { getTaskQueueDocumentName } from "../taskQueue/_utils.ts";
import { getTaskQueue } from "../taskQueue/getTaskQueue.ts";
import { getChatDocumentName } from "./_utils.ts";
import { getChat } from "./getChat.ts";
import { getChatInteraction } from "./getChatInteraction.ts";
import { assertChatIdle, queueChat } from "./queueChat.ts";

export const submitVoiceMessageSchema = z.object({
  agentId: z.string().min(1),
  activityId: z.uuid(),
  voice: voiceMessageSchema,
  thinking: z.boolean().optional(),
});

export async function submitVoiceMessage(
  {
    agentId,
    activityId,
    voice,
    thinking,
  }: z.infer<typeof submitVoiceMessageSchema>,
  {
    supabase,
    userId,
    userClaims,
    serverToken,
    websocketProvider,
  }: {
    supabase: SupabaseClient;
    userId: string;
    userClaims: UserClaims;
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
) {
  const ids = { agentId, activityId };
  const storage = { ...ids, type: "activity" as const };
  const path = validateStoragePath(voice.path);
  const agent = await getAgentById(agentId, { supabase });
  requirePlatformAccess(userClaims, "user", "user", agent.workspaceId);
  await requireStorageAccess(storage, "write", { supabase });
  if (!agent.transcriberIdentifier) throw new Error("TRANSCRIBER_REQUIRED");
  const file = await inspect(
    path,
    new StorageSession({ storage, supabaseStorage: supabase.storage }),
  );
  if (
    !file?.file ||
    !file.type?.startsWith("audio/") ||
    fileNeedsProcessing(path) !== "transcript"
  )
    throw new Error("AUDIO_FILE_REQUIRED");

  const config = { serverToken, websocketProvider };
  await using chat = new ServerRealtimeProvider({
    ...config,
    documentName: getChatDocumentName(ids),
  });
  await using taskQueue = new ServerRealtimeProvider({
    ...config,
    documentName: getTaskQueueDocumentName(),
  });
  await Promise.all([chat.waitForSynced(), taskQueue.waitForSynced()]);
  const messages = getChat(chat.document).messages?.toArray() ?? [];
  // Retrying an upload acknowledgement must not send the same recording twice.
  if (
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
          ["pending", "claimed"].includes(task.state),
      )
  )
    return;
  assertChatIdle(ids, { chat, taskQueue });
  if (getChatInteraction(messages).type === "tool-approval")
    throw new Error("TOOL_APPROVAL_REQUIRED");
  await queueChat(
    { ...ids, userId, userClaims, voice: { ...voice, path }, thinking },
    { chat, taskQueue },
  );
}
