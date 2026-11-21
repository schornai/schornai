import { selectChatFile } from "../documents/storage/selectChatFile.ts";
import { limitPlatformClaims } from "@schornio/aibox-database/mcp/platformAccess";
import { getWorkspaces } from "@schornio/aibox-database/workspace/getWorkspaces";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { getRealtimeDocumentPermission } from "@schornio/aibox-database/realtime/getRealtimeDocumentPermission";
import { ensureRealtimeDocument } from "@schornio/aibox-database/realtime/ensureRealtimeDocument";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import { getChatDocumentName } from "../documents/chat/_utils.ts";
import { assertChatIdle, queueChat } from "../documents/chat/queueChat.ts";
import { getTaskQueueDocumentName } from "../documents/taskQueue/_utils.ts";
import { getChatCurrentMessageDocumentName } from "../documents/chatCurrentMessage/_utils.ts";
import { addChatCurrentMessage } from "../documents/chatCurrentMessage/addChatCurrentMessage.ts";
import { setChatCurrentMessageState } from "../documents/chatCurrentMessage/setChatCurrentMessageState.ts";
import { platformRegistry, type PlatformContext } from "./registry.ts";
import type { Storage } from "@schornio/aibox-database/storage/_types";

export async function sendChatMessage(
  {
    agentId,
    activityId,
    text,
    thinking,
    files: fileRefs = [],
    newActivityId,
  }: {
    agentId: string;
    activityId?: string;
    newActivityId?: string;
    text: string;
    thinking?: boolean;
    files?: {
      storage: Storage;
      path: string;
      attachmentMode?: "copy" | "reference";
    }[];
  },
  context: PlatformContext & { abortSignal?: AbortSignal },
) {
  const { supabase, serverToken, websocketProvider, abortSignal } = context;
  abortSignal?.throwIfAborted();
  const { workspace } = platformRegistry(context);
  if (!text.trim() && !fileRefs.length) throw new Error("MESSAGE_REQUIRED");
  workspace("user", (await getAgentById(agentId, { supabase })).workspaceId);
  const input = {
    agentId,
    activityId: activityId ?? newActivityId ?? crypto.randomUUID(),
  };
  abortSignal?.throwIfAborted();
  if (activityId) {
    const permission = await getRealtimeDocumentPermission(
      getChatDocumentName(input),
      { supabase, userId: context.userId, isAdmin: context.claims === "admin" },
    );
    if (!permission) throw new Error("NOT_AUTHORIZED");
  } else
    await ensureRealtimeDocument(
      getChatDocumentName(input),
      { userIds: [context.userId] },
      { supabase: context.supabaseServiceRole },
    );
  await using chat = new ServerRealtimeProvider({
    documentName: getChatDocumentName(input),
    serverToken,
    websocketProvider,
    disposalAbortSignal: abortSignal,
  });
  await using taskQueue = new ServerRealtimeProvider({
    documentName: getTaskQueueDocumentName(),
    serverToken,
    websocketProvider,
    disposalAbortSignal: abortSignal,
  });
  await using draft = new ServerRealtimeProvider({
    documentName: getChatCurrentMessageDocumentName(input),
    serverToken,
    websocketProvider,
    disposalAbortSignal: abortSignal,
  });
  await Promise.all([
    chat.waitForSynced(abortSignal ? { abortSignal } : undefined),
    taskQueue.waitForSynced(abortSignal ? { abortSignal } : undefined),
    draft.waitForSynced(abortSignal ? { abortSignal } : undefined),
  ]);
  assertChatIdle(input, { chat, taskQueue });
  const files = [];
  for (const ref of fileRefs) {
    abortSignal?.throwIfAborted();
    const selected = await selectChatFile(
      { ...input, ...ref },
      { supabase, serverToken, websocketProvider, abortSignal },
    );
    if (!selected.file) throw new Error("FILE_NOT_PROCESSED");
    files.push(selected.file);
  }
  abortSignal?.throwIfAborted();
  const { messageId } = addChatCurrentMessage(draft.document, {
    type: "text",
    text,
    thinking,
    files,
  });
  setChatCurrentMessageState(draft.document, messageId, "submitted");
  await draft.waitForSynced(abortSignal ? { abortSignal } : undefined);
  const ids =
    context.claims === "admin" && context.level !== "admin"
      ? (await getWorkspaces({ supabase })).map((workspace) => workspace.id)
      : [];
  const userClaims = limitPlatformClaims(context.claims, context.level, ids);
  await queueChat(
    { ...input, userId: context.userId, userClaims },
    { chat, taskQueue, abortSignal },
  );
  return { ...input, messageId, status: "queued" };
}
