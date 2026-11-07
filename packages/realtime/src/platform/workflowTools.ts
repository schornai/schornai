import { removeActivityFromHistory } from "../documents/activity/removeActivityFromHistory.ts";
import { storageSchema } from "@schornio/aibox-database/storage/_schemas";
import { z } from "zod";
import type { PlatformContext, platformRegistry } from "./registry.ts";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { getTranscriberById } from "@schornio/aibox-database/transcriber/getTranscriberById";
import { ensureRealtimeDocument } from "@schornio/aibox-database/realtime/ensureRealtimeDocument";
import { getRealtimeDocumentPermission } from "@schornio/aibox-database/realtime/getRealtimeDocumentPermission";
import { getWorkspaces } from "@schornio/aibox-database/workspace/getWorkspaces";
import { limitPlatformClaims } from "@schornio/aibox-database/mcp/platformAccess";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import { getChatDocumentName } from "../documents/chat/_utils.ts";
import { getTranscribeDocumentName } from "../documents/transcribe/_utils.ts";
import { getActivitiesDocumentName } from "../documents/activity/_utils.ts";
import { upsertActivity } from "../documents/activity/upsertActivity.ts";
import { getChatCurrentMessageDocumentName } from "../documents/chatCurrentMessage/_utils.ts";
import { getChatCurrentMessageBatch } from "../documents/chatCurrentMessage/getChatCurrentMessageBatch.ts";
import { addChatCurrentMessage } from "../documents/chatCurrentMessage/addChatCurrentMessage.ts";
import { deleteChatCurrentMessage } from "../documents/chatCurrentMessage/deleteChatCurrentMessage.ts";
import { patchChatCurrentMessageContent } from "../documents/chatCurrentMessage/patchChatCurrentMessageContent.ts";
import { setChatCurrentMessageState } from "../documents/chatCurrentMessage/setChatCurrentMessageState.ts";
import { normalizeChatCurrentMessage } from "../documents/chatCurrentMessage/normalizeChatCurrentMessage.ts";
import { getTaskQueueDocumentName } from "../documents/taskQueue/_utils.ts";
import { assertChatIdle, queueChat } from "../documents/chat/queueChat.ts";
import { getChat } from "../documents/chat/getChat.ts";
import { getChatInteraction } from "../documents/chat/getChatInteraction.ts";
import {
  selectChatFile,
  selectChatFileSchema,
} from "../documents/storage/selectChatFile.ts";

export function addWorkflowTools(
  context: PlatformContext,
  { add, workspace }: ReturnType<typeof platformRegistry>,
) {
  const { supabase, serverToken, websocketProvider } = context;
  const options = { serverToken, websocketProvider };
  const chatId = z.object({ agentId: z.string().min(1), activityId: z.uuid() });
  async function authorize(input: z.infer<typeof chatId>) {
    workspace(
      "user",
      (await getAgentById(input.agentId, { supabase })).workspaceId,
    );
    if (
      !(await getRealtimeDocumentPermission(getChatDocumentName(input), {
        supabase,
        userId: context.userId,
        isAdmin: context.claims === "admin",
      }))
    )
      throw new Error("NOT_AUTHORIZED");
  }
  async function withChat<T>(
    input: z.infer<typeof chatId>,
    run: (p: {
      chat: ServerRealtimeProvider;
      draft: ServerRealtimeProvider;
      taskQueue: ServerRealtimeProvider;
    }) => Promise<T>,
  ) {
    await authorize(input);
    await using chat = new ServerRealtimeProvider({
      ...options,
      documentName: getChatDocumentName(input),
    });
    await using draft = new ServerRealtimeProvider({
      ...options,
      documentName: getChatCurrentMessageDocumentName(input),
    });
    await using taskQueue = new ServerRealtimeProvider({
      ...options,
      documentName: getTaskQueueDocumentName(),
    });
    await Promise.all([
      chat.waitForSynced(),
      draft.waitForSynced(),
      taskQueue.waitForSynced(),
    ]);
    return run({ chat, draft, taskQueue });
  }
  async function submit(
    input: z.infer<typeof chatId>,
    p: {
      chat: ServerRealtimeProvider;
      draft: ServerRealtimeProvider;
      taskQueue: ServerRealtimeProvider;
    },
  ) {
    assertChatIdle(input, p);
    await p.draft.waitForSynced();
    const ids =
      context.claims === "admin" && context.level !== "admin"
        ? (await getWorkspaces({ supabase })).map((w) => w.id)
        : [];
    await queueChat(
      {
        ...input,
        userId: context.userId,
        userClaims: limitPlatformClaims(context.claims, context.level, ids),
      },
      p,
    );
  }
  add(
    "platform_activity_create",
    "Create a chat or transcription activity, with access restricted to you. Use the returned storage reference to upload and process files.",
    "user",
    false,
    z.object({
      kind: z.enum(["chat", "transcription"]),
      resourceId: z.string().min(1),
      label: z.string().max(500).optional(),
    }),
    async ({ kind, resourceId, label }) => {
      const resource =
        kind === "chat"
          ? await getAgentById(resourceId, { supabase })
          : await getTranscriberById(resourceId, { supabase });
      workspace("user", resource.workspaceId);
      const activityId = crypto.randomUUID();
      const storage =
        kind === "chat"
          ? { type: "activity" as const, agentId: resourceId, activityId }
          : {
              type: "activity-transcription" as const,
              transcriberId: resourceId,
              activityId,
            };
      const name =
        storage.type === "activity"
          ? getChatDocumentName(storage)
          : getTranscribeDocumentName(storage);
      await ensureRealtimeDocument(
        name,
        { userIds: [context.userId] },
        { supabase: context.supabaseServiceRole },
      );
      await using activities = new ServerRealtimeProvider({
        ...options,
        documentName: getActivitiesDocumentName({ userId: context.userId }),
      });
      await activities.waitForSynced();
      upsertActivity(
        activities.document,
        {
          id: activityId,
          content:
            kind === "chat"
              ? { type: "chat", chatbotId: resourceId }
              : { type: "transcription", transcriberId: resourceId },
        },
        {
          labelOnInsert:
            label ?? (kind === "chat" ? "Chat" : "Transkriptionen"),
        },
      );
      await activities.waitForSynced();
      return { activityId, storage };
    },
  );
  add(
    "platform_activity_delete",
    "Remove an activity from history, including shared participants' history when you belong to the activity. As in the UI, this does not erase its files or cancel a running task.",
    "user",
    false,
    z.object({ activityId: z.uuid() }),
    async ({ activityId }) => {
      await removeActivityFromHistory(activityId, context);
      return { activityId };
    },
  );

  add(
    "platform_chat_drafts",
    "Read the chat's pending batch, including paused messages and tool approval responses.",
    "user",
    true,
    chatId,
    (input) =>
      withChat(input, async ({ draft }) =>
        getChatCurrentMessageBatch(draft.document)
          .toArray()
          .map(normalizeChatCurrentMessage),
      ),
  );
  add(
    "platform_chat_draft_update",
    "Add, edit or delete a paused text draft. Claimed/queued drafts cannot be modified. Use platform_chat_submit_batch to submit paused drafts.",
    "user",
    false,
    chatId.extend({
      messageId: z.string().optional(),
      text: z.string().max(100000).default(""),
      thinking: z.boolean().optional(),
      remove: z.boolean().default(false),
    }),
    (input) =>
      withChat(input, async ({ draft }) => {
        let id = input.messageId;
        if (id) {
          const item = getChatCurrentMessageBatch(draft.document)
            .toArray()
            .map(normalizeChatCurrentMessage)
            .find((x) => x.id === id);
          if (!item || item.content.type !== "text" || item.state !== "paused")
            throw new Error("DRAFT_NOT_EDITABLE");
          if (input.remove) deleteChatCurrentMessage(draft.document, id);
          else
            patchChatCurrentMessageContent(draft.document, id, {
              type: "text",
              text: input.text,
              thinking: input.thinking,
            });
        } else {
          if (input.remove) throw new Error("MESSAGE_REQUIRED");
          id = addChatCurrentMessage(draft.document, {
            type: "text",
            text: input.text,
            thinking: input.thinking,
          }).messageId;
          setChatCurrentMessageState(draft.document, id, "paused");
        }
        await draft.waitForSynced();
        return { messageId: id };
      }),
  );
  add(
    "platform_chat_submit_batch",
    "Submit paused text drafts and start the chat's batch processing. Requires the chat to be idle.",
    "user",
    false,
    chatId,
    (input) =>
      withChat(input, async (p) => {
        assertChatIdle(input, p);
        for (const item of getChatCurrentMessageBatch(p.draft.document)
          .toArray()
          .map(normalizeChatCurrentMessage))
          if (item.content.type === "text" && item.state === "paused")
            setChatCurrentMessageState(p.draft.document, item.id, "submitted");
        await submit(input, p);
        return { status: "queued" };
      }),
  );
  add(
    "platform_chat_tool_approval",
    "Approve or deny the exact pending tool request in a permitted chat and resume processing. OAuth sign-in, if requested by the external provider, still requires that provider's browser flow.",
    "user",
    false,
    chatId.extend({ approvalId: z.string().min(1), approved: z.boolean() }),
    (input) =>
      withChat(input, async (p) => {
        assertChatIdle(input, p);
        const interaction = getChatInteraction(
          getChat(p.chat.document).messages?.toArray() ?? [],
        );
        if (
          interaction.type !== "tool-approval" ||
          interaction.request.approvalId !== input.approvalId ||
          getChatCurrentMessageBatch(p.draft.document)
            .toArray()
            .map(normalizeChatCurrentMessage)
            .some((x) => x.content.type === "tool-approval")
        )
          throw new Error("APPROVAL_NOT_PENDING");
        const { messageId } = addChatCurrentMessage(p.draft.document, {
          type: "tool-approval",
          approvalId: input.approvalId,
          approved: input.approved,
        });
        setChatCurrentMessageState(p.draft.document, messageId, "submitted");
        await submit(input, p);
        return { status: "queued" };
      }),
  );
  add(
    "platform_chat_file_select",
    "Select a processed file for a chat, reusing an authorized mounted file or copying it into the activity as the UI does. Returns a validated attachment descriptor.",
    "user",
    false,
    selectChatFileSchema,
    async (input) => {
      await authorize(input);
      return selectChatFile(input, {
        supabase,
        serverToken,
        websocketProvider,
      });
    },
  );
  add(
    "platform_chat_draft_files",
    "Replace the attachments of a paused draft with authorized processed files. Each file goes through the same selection/copy operation as the UI.",
    "user",
    false,
    chatId.extend({
      messageId: z.string().min(1),
      files: z
        .array(z.object({ storage: storageSchema, path: z.string() }))
        .max(50),
    }),
    (input) =>
      withChat(input, async ({ draft }) => {
        const item = getChatCurrentMessageBatch(draft.document)
          .toArray()
          .map(normalizeChatCurrentMessage)
          .find((x) => x.id === input.messageId);
        if (!item || item.content.type !== "text" || item.state !== "paused")
          throw new Error("DRAFT_NOT_EDITABLE");
        const files = [];
        for (const ref of input.files) {
          const selected = await selectChatFile(
            { ...input, ...ref },
            { supabase, serverToken, websocketProvider },
          );
          if (!selected.file) throw new Error("FILE_NOT_PROCESSED");
          files.push(selected.file);
        }
        patchChatCurrentMessageContent(draft.document, input.messageId, {
          type: "text",
          files,
        });
        await draft.waitForSynced();
        return { messageId: input.messageId };
      }),
  );
}
