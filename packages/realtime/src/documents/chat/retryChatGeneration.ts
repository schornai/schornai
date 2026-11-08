import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { UserClaims } from "@schornio/aibox-database/auth/_types";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { getRealtimeDocumentPermission } from "@schornio/aibox-database/realtime/getRealtimeDocumentPermission";
import { requirePlatformAccess } from "@schornio/aibox-database/mcp/platformAccess";
import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import { getTaskQueueDocumentName } from "../taskQueue/_utils.ts";
import { getChatDocumentName } from "./_utils.ts";
import { getChat } from "./getChat.ts";
import { getChatInteraction } from "./getChatInteraction.ts";
import { assertChatIdle, queueChat } from "./queueChat.ts";

/** Authenticated identity and user-scoped client required; authorizes the resource before opening worker providers. */
export async function retryChatGeneration(
  input: { agentId: string; activityId: string },
  options: {
    userId: string;
    userClaims: UserClaims;
    supabase: SupabaseClient;
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
) {
  const { userId, userClaims, supabase, serverToken, websocketProvider } =
    options;
  const agent = await getAgentById(input.agentId, { supabase });
  requirePlatformAccess(userClaims, "user", "user", agent.workspaceId);
  const documentName = getChatDocumentName(input);
  if (
    !(await getRealtimeDocumentPermission(documentName, {
      supabase,
      userId,
      isAdmin: userClaims === "admin",
    }))
  )
    throw new Error("NOT_AUTHORIZED");

  const config = { serverToken, websocketProvider };
  await using chat = new ServerRealtimeProvider({ ...config, documentName });
  await using taskQueue = new ServerRealtimeProvider({
    ...config,
    documentName: getTaskQueueDocumentName(),
  });
  await Promise.all([chat.waitForSynced(), taskQueue.waitForSynced()]);
  assertChatIdle(input, { chat, taskQueue });
  if (chat.document.getMap("state").get("type") !== "error")
    throw new Error("CHAT_NOT_FAILED");
  const messages = getChat(chat.document).messages?.toArray() ?? [];
  if (!messages.some((message) => message.role === "user"))
    throw new Error("MESSAGE_REQUIRED");
  if (getChatInteraction(messages).type === "tool-approval")
    throw new Error("TOOL_APPROVAL_REQUIRED");
  await queueChat(
    { ...input, userId, userClaims, retry: true },
    { chat, taskQueue },
  );
}
