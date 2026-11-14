import { sendChatMessage } from "./sendChatMessage.ts";
import { chatExpirationSchema } from "@schornio/aibox-database/chat/expirationSchema";
import { setChatExpiration } from "@schornio/aibox-database/chat/setChatExpiration";
import { getChatExpiration } from "@schornio/aibox-database/chat/getChatExpiration";
import { setActivityLabel } from "../documents/activity/setActivityLabel.ts";
import { retryChatGeneration } from "../documents/chat/retryChatGeneration.ts";
import { storageSchema } from "@schornio/aibox-database/storage/_schemas";
import { abortChatGeneration } from "../documents/chat/abortChatGeneration.ts";
import { limitPlatformClaims } from "@schornio/aibox-database/mcp/platformAccess";
import { getWorkspaces } from "@schornio/aibox-database/workspace/getWorkspaces";
import { z } from "zod";
import type { PlatformContext, platformRegistry } from "./registry.ts";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { getRealtimeDocumentPermission } from "@schornio/aibox-database/realtime/getRealtimeDocumentPermission";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import { getChatDocumentName } from "../documents/chat/_utils.ts";
import { getChat } from "../documents/chat/getChat.ts";
import { getActivitiesDocumentName } from "../documents/activity/_utils.ts";
import { getActivities } from "../documents/activity/getActivities.ts";
import { upsertActivity } from "../documents/activity/upsertActivity.ts";

export function addChatTools(
  context: PlatformContext,
  registry: ReturnType<typeof platformRegistry>,
) {
  const { add, workspace } = registry;
  const { supabase, serverToken, websocketProvider } = context;
  const chatId = z.object({ activityId: z.uuid(), agentId: z.string().min(1) });
  async function authorizeChat(input: z.infer<typeof chatId>) {
    workspace(
      "user",
      (await getAgentById(input.agentId, { supabase })).workspaceId,
    );
    const permission = await getRealtimeDocumentPermission(
      getChatDocumentName(input),
      { supabase, userId: context.userId, isAdmin: context.claims === "admin" },
    );
    if (!permission) throw new Error("NOT_AUTHORIZED");
  }
  add(
    "platform_activities_list",
    "List your own activities and chat identifiers.",
    "user",
    true,
    z.object({}),
    async () => {
      await using provider = new ServerRealtimeProvider({
        documentName: getActivitiesDocumentName({ userId: context.userId }),
        serverToken,
        websocketProvider,
      });
      await provider.waitForSynced();
      return Array.from(getActivities(provider.document).activities.values());
    },
  );
  add(
    "platform_chat_read",
    "Read a permitted chat's messages and generation state. Poll after submitting a message.",
    "user",
    true,
    chatId,
    async (input) => {
      await authorizeChat(input);
      await using provider = new ServerRealtimeProvider({
        documentName: getChatDocumentName(input),
        serverToken,
        websocketProvider,
      });
      await provider.waitForSynced();
      const chat = getChat(provider.document);
      return {
        messages: chat.messages?.toArray(),
        state: provider.document.getMap("state").toJSON(),
      };
    },
  );
  add(
    "platform_chat_expiration_set",
    "Set or disable automatic deletion for a chat you participate in. seconds must be 43200 (12 hours), or null to disable. Requires disappearing chats to be enabled for this agent. The fixed deadline starts now; new messages do not extend it. Deletes messages, drafts, history and chat files for all participants. Cannot undo deletion once it begins.",
    "user",
    false,
    chatExpirationSchema,
    async (input) => {
      await authorizeChat(input);
      return setChatExpiration(input, {
        userId: context.userId,
        supabase: context.supabaseServiceRole,
      });
    },
  );
  add(
    "platform_chat_expiration_get",
    "Read the automatic deletion deadline of a permitted chat.",
    "user",
    true,
    chatId,
    async (input) => {
      await authorizeChat(input);
      return getChatExpiration(input, { supabase });
    },
  );
  add(
    "platform_chat_send",
    "Send text to an agent. Omit activityId to start a new chat. Returns immediately after queueing; use platform_chat_read for results. Fails if the chat is busy.",
    "user",
    false,
    z.object({
      agentId: z.string().min(1),
      activityId: z.uuid().optional(),
      text: z.string().max(100_000),
      thinking: z.boolean().optional(),
      files: z
        .array(z.object({ storage: storageSchema, path: z.string() }))
        .max(50)
        .default([]),
    }),
    (input) => sendChatMessage(input, context),
  );
  add(
    "platform_activity_update",
    "Rename or pin an activity in your own history.",
    "user",
    false,
    z.object({
      activityId: z.uuid(),
      label: z.string().max(500).optional(),
      pinned: z.boolean().optional(),
    }),
    async ({ activityId, label, pinned }) => {
      await using provider = new ServerRealtimeProvider({
        documentName: getActivitiesDocumentName({ userId: context.userId }),
        serverToken,
        websocketProvider,
      });
      await provider.waitForSynced();
      if (!getActivities(provider.document).activities.has(activityId))
        throw new Error("NOT_FOUND");
      if (label !== undefined)
        setActivityLabel(provider.document, activityId, label);
      upsertActivity(
        provider.document,
        {
          id: activityId,
          ...(pinned === undefined ? {} : { pinned }),
        },
        { minorChange: true },
      );
      await provider.waitForSynced();
      return { activityId };
    },
  );
  add(
    "platform_chat_retry",
    "Continue a failed chat from its existing history without resending a user message or processing queued drafts. Requires an error state and no pending tool approval.",
    "user",
    false,
    chatId,
    async (input) => {
      await authorizeChat(input);
      const userClaims = limitPlatformClaims(
        context.claims,
        context.level,
        context.claims === "admin"
          ? (await getWorkspaces({ supabase })).map((workspace) => workspace.id)
          : [],
      );
      await retryChatGeneration(input, {
        userId: context.userId,
        userClaims,
        supabase,
        serverToken,
        websocketProvider,
      });
      return { ...input, status: "queued" };
    },
  );
  add(
    "platform_chat_abort",
    "Stop a chat generation and pause its queued messages. Waits for the worker to acknowledge cancellation.",
    "user",
    false,
    chatId,
    async (input) => {
      await authorizeChat(input);
      await abortChatGeneration(input, {
        userId: context.userId,
        supabaseServiceRole: context.supabaseServiceRole,
        serverToken,
        websocketProvider,
      });
      return { ...input, status: "stopped" };
    },
  );
}
