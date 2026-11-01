"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import {
  ServerBatchRealtimeProvider,
  ServerRealtimeProvider,
} from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { getAllowedUserIdsByDocumentName } from "@schornio/aibox-realtime/_lib/getAllowedUserIdsByDocumentName";
import { getChatDocumentName } from "@schornio/aibox-realtime/documents/chat/_utils";
import { getChatCurrentMessageDocumentName } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_utils";
import { getChatCurrentMessageBatch } from "@schornio/aibox-realtime/documents/chatCurrentMessage/getChatCurrentMessageBatch";
import { normalizeChatCurrentMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/normalizeChatCurrentMessage";
import { setChatCurrentMessageState } from "@schornio/aibox-realtime/documents/chatCurrentMessage/setChatCurrentMessageState";
import { requestTaskAbort } from "@schornio/aibox-realtime/documents/taskQueue/requestTaskAbort";
import { getTaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/getTaskQueue";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { upsertActivity } from "@schornio/aibox-realtime/documents/activity/upsertActivity";
import { setChatState } from "@schornio/aibox-realtime/documents/chat/setChatState";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const abortChatGeneration = serverActionClient
  .inputSchema(z.object({ activityId: z.string(), agentId: z.string() }))
  .action(async ({ parsedInput: { activityId, agentId } }) => {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });
    const supabaseServiceRole = createSupabaseServiceRoleClient();
    const documentName = getChatDocumentName({ activityId, agentId });
    const userIds = await getAllowedUserIdsByDocumentName(documentName, {
      supabase: supabaseServiceRole,
    });
    if (!userIds.includes(user.id)) throw new Error("NOT_AUTHORIZED");

    const syncOptions = { abortSignal: AbortSignal.timeout(30_000) };
    const config = {
      disposalAbortSignal: syncOptions.abortSignal,
      serverToken: getRealtimeServerToken(),
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    };
    await using queue = new ServerRealtimeProvider({
      ...config,
      documentName: getTaskQueueDocumentName(),
    });
    await using chat = new ServerRealtimeProvider({ ...config, documentName });
    await using current = new ServerRealtimeProvider({
      ...config,
      documentName: getChatCurrentMessageDocumentName({ activityId, agentId }),
    });
    await using activities = new ServerBatchRealtimeProvider({
      ...config,
      documentNames: userIds.map((userId) =>
        getActivitiesDocumentName({ userId }),
      ),
    });
    await Promise.all([
      queue.waitForSynced(syncOptions),
      chat.waitForSynced(syncOptions),
      current.waitForSynced(syncOptions),
      activities.waitForSynced(syncOptions),
    ]);

    // Keep queued drafts so a cancellation never continues the next batch item.
    current.document.transact(() => {
      for (const input of getChatCurrentMessageBatch(current.document)
        .toArray()
        .map(normalizeChatCurrentMessage)) {
        if (
          input.content.type === "text" &&
          (input.state === "submitted" || input.state === "queued")
        ) {
          setChatCurrentMessageState(current.document, input.id, "paused");
        }
      }
    });
    const { tasks } = getTaskQueue(queue.document);
    const taskIds = new Set(
      tasks
        .toArray()
        .filter(
          (task) =>
            task.type === "chat" &&
            task.parameters?.agentId === agentId &&
            task.parameters?.activityId === activityId &&
            ["pending", "claimed", "aborting"].includes(task.state),
        )
        .map((task) => task.id),
    );
    if (!taskIds.size) {
      await current.waitForSynced(syncOptions);
      return;
    }

    const cancellationId = crypto.randomUUID();
    const cancellations = chat.document.getMap<boolean>("cancellations");
    cancellations.set(cancellationId, true);
    try {
      setChatState(chat.document, { type: "aborting" });
      // Publish the submission lock before the worker can acknowledge the request.
      await chat.waitForSynced(syncOptions);
      queue.document.transact(() => {
        for (const id of taskIds) requestTaskAbort(queue.document, id);
      });
      await Promise.all([
        queue.waitForSynced(syncOptions),
        current.waitForSynced(syncOptions),
        chat.waitForSynced(syncOptions),
      ]);

      // Wait for the worker to stop before enabling another generation.
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          tasks.unobserve(check);
          syncOptions.abortSignal.removeEventListener("abort", onAbort);
        };
        const check = () => {
          if (
            !tasks
              .toArray()
              .some(
                (task) =>
                  taskIds.has(task.id) &&
                  ["pending", "claimed", "aborting"].includes(task.state),
              )
          ) {
            cleanup();
            resolve();
          }
        };
        const onAbort = () => {
          cleanup();
          reject(syncOptions.abortSignal.reason);
        };
        tasks.observe(check);
        syncOptions.abortSignal.addEventListener("abort", onAbort, {
          once: true,
        });
        if (syncOptions.abortSignal.aborted) onAbort();
        else check();
      });
      const state = chat.document.getMap("state");
      const generationId = state.get("generationId");
      const hasNewTask = tasks
        .toArray()
        .some(
          (task) =>
            task.type === "chat" &&
            task.parameters?.agentId === agentId &&
            task.parameters?.activityId === activityId &&
            !taskIds.has(task.id) &&
            ["pending", "claimed", "aborting"].includes(task.state),
        );
      if (
        state.get("type") === "aborting" &&
        !hasNewTask &&
        (generationId === undefined || taskIds.has(String(generationId)))
      ) {
        setChatState(chat.document, { type: "idle" });
        if (
          tasks
            .toArray()
            .some((task) => taskIds.has(task.id) && task.state === "aborted")
        )
          activities.batch(upsertActivity, { id: activityId, state: "idle" });
      }
      await Promise.all([
        chat.waitForSynced(syncOptions),
        activities.waitForSynced(syncOptions),
      ]);
    } finally {
      cancellations.delete(cancellationId);
      await chat.waitForSynced(syncOptions);
    }
  });
