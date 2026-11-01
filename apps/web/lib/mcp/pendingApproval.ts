import { assertChatIdle, queueChat } from "@/lib/chat/queueChat";
import { getAgentWorkspaceId } from "@schornio/aibox-package-database/agent/getAgentWorkspaceId";
import { hasPermission } from "@/lib/hasPermission";
import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getRealtimeDocumentPermission } from "@schornio/aibox-package-database/realtime/getRealtimeDocumentPermission";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { getChatDocumentName } from "@schornio/aibox-realtime/documents/chat/_utils";
import { getChat } from "@schornio/aibox-realtime/documents/chat/getChat";
import { getChatInteraction } from "@schornio/aibox-realtime/documents/chat/getChatInteraction";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";
import { getChatCurrentMessageDocumentName } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_utils";
import { addChatCurrentMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/addChatCurrentMessage";
import { setChatCurrentMessageState } from "@schornio/aibox-realtime/documents/chatCurrentMessage/setChatCurrentMessageState";

/** Validate the exact pending request, with user-scoped document access. OAuth
 * state binds these identifiers; callbacks never approve a URL-supplied tool. */
export async function pendingMCPApproval(
  context: {
    agentId: string;
    activityId: string;
    approvalId: string;
    mcpId: string;
  },
  resume = false,
) {
  const { agentId, activityId, approvalId, mcpId } = context;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const documentName = getChatDocumentName({ agentId, activityId });
  if (
    !user ||
    !approvalId ||
    !(await getRealtimeDocumentPermission(documentName, {
      supabase,
      userId: user.id,
    }))
  )
    throw new Error("Chat unavailable");
  const userClaims = await getCurrentUserClaims({
    supabaseAuth: supabase.auth,
  });
  const workspaceId = await getAgentWorkspaceId(agentId, { supabase });
  const claim =
    userClaims === "admin"
      ? "admin"
      : userClaims.find((item) => item.organization_id === workspaceId)?.role;
  if (!workspaceId || !hasPermission({ claim, permission: "user" }))
    throw new Error("Not authorized");
  const options = {
    serverToken: getRealtimeServerToken(),
    websocketProvider: new ServerRealtimeWebsocketProvider(),
  };
  await using chat = new ServerRealtimeProvider({ ...options, documentName });
  await chat.waitForSynced({ abortSignal: AbortSignal.timeout(15_000) });
  const interaction = getChatInteraction(
    getChat(chat.document).messages?.toArray() ?? [],
  );
  if (
    interaction.type !== "tool-approval" ||
    interaction.request.approvalId !== approvalId ||
    interaction.request.toolName !== "mcp" ||
    (interaction.request.input as { serverId?: unknown })?.serverId !== mcpId
  )
    throw new Error("Approval no longer pending");
  if (!resume) return;
  await using queue = new ServerRealtimeProvider({
    ...options,
    documentName: getTaskQueueDocumentName(),
  });
  await using draft = new ServerRealtimeProvider({
    ...options,
    documentName: getChatCurrentMessageDocumentName({ agentId, activityId }),
  });
  await Promise.all([queue.waitForSynced(), draft.waitForSynced()]);
  assertChatIdle({ agentId, activityId }, { chat, taskQueue: queue });
  const { messageId } = addChatCurrentMessage(draft.document, {
    type: "tool-approval",
    approvalId,
    approved: true,
  });
  setChatCurrentMessageState(draft.document, messageId, "submitted");
  await draft.waitForSynced();
  await queueChat(
    { agentId, activityId, userId: user.id, userClaims },
    { chat, taskQueue: queue },
  );
}
