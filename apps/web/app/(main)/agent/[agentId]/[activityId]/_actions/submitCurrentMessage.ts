"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { ensureDocument } from "@schornio/aibox-realtime/server/ensureDocument";
import { getChatDocumentName } from "@schornio/aibox-realtime/documents/chat/_utils";
import { getCurrentUser } from "@schornio/aibox-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-database/user/getCurrentUserClaims";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";
import { getAgentWorkspaceId } from "@schornio/aibox-package-database/agent/getAgentWorkspaceId";
import { hasPermission } from "@/lib/hasPermission";
import { assertChatIdle, queueChat } from "@/lib/chat/queueChat";

export const submitCurrentMessage = serverActionClient
  .inputSchema(
    z.object({
      activityId: z.string(),
      agentId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { activityId, agentId } }) => {
    const supabase = await createSupabaseServerClient();
    const [user, userClaims] = await Promise.all([
      getCurrentUser({ supabaseAuth: supabase.auth }),
      getCurrentUserClaims({ supabaseAuth: supabase.auth }),
    ]);

    const supabaseServiceRole = createSupabaseServiceRoleClient();
    const workspaceId = await getAgentWorkspaceId(agentId, {
      supabase: supabaseServiceRole,
    });
    if (!workspaceId) throw new Error("NOT_FOUND");
    const claim =
      userClaims === "admin"
        ? "admin"
        : userClaims.find((item) => item.organization_id === workspaceId)?.role;
    if (!hasPermission({ claim, permission: "user" })) {
      throw new Error("NOT_AUTHORIZED");
    }

    const serverToken = getRealtimeServerToken();
    const websocketProvider = new ServerRealtimeWebsocketProvider();

    await using taskQueue = new ServerRealtimeProvider({
      documentName: getTaskQueueDocumentName(),
      serverToken,
      websocketProvider,
    });

    const chatDocumentName = getChatDocumentName({ activityId, agentId });

    await ensureDocument(
      chatDocumentName,
      { userIds: [user.id] },
      { supabase: supabaseServiceRole },
    );

    await using chat = new ServerRealtimeProvider({
      documentName: chatDocumentName,
      serverToken,
      websocketProvider,
    });

    await Promise.all([taskQueue.waitForSynced(), chat.waitForSynced()]);

    assertChatIdle({ agentId, activityId }, { chat, taskQueue });
    await queueChat(
      { agentId, activityId, userId: user.id, userClaims },
      { chat, taskQueue },
    );
  });
