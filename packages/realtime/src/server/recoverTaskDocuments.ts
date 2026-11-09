import { isChatDeleted } from "@schornio/aibox-database/chat/isChatDeleted";
import type { Hocuspocus } from "@hocuspocus/server";
import type { Task } from "../documents/taskQueue/_types.ts";
import type { TaskClaimOptions } from "@schornio/aibox-database/task/_types";
import { persistRealtimeDocument } from "./persistRealtimeDocument.ts";
import { getAllowedUserIdsByDocumentName } from "../_lib/getAllowedUserIdsByDocumentName.ts";
import { getChatDocumentName } from "../documents/chat/_utils.ts";
import { getChatCurrentMessageDocumentName } from "../documents/chatCurrentMessage/_utils.ts";
import { getChatCurrentMessageBatch } from "../documents/chatCurrentMessage/getChatCurrentMessageBatch.ts";
import { normalizeChatCurrentMessage } from "../documents/chatCurrentMessage/normalizeChatCurrentMessage.ts";
import { setChatCurrentMessageState } from "../documents/chatCurrentMessage/setChatCurrentMessageState.ts";
import { getActivitiesDocumentName } from "../documents/activity/_utils.ts";
import { upsertActivity } from "../documents/activity/upsertActivity.ts";
import { setChatState } from "../documents/chat/setChatState.ts";
import { getChat } from "../documents/chat/getChat.ts";
import { getChatInteraction } from "../documents/chat/getChatInteraction.ts";

/** A terminal task can outlive the worker that normally releases its chat. */
export async function recoverTaskDocuments(
  instance: Hocuspocus,
  task: Task,
  { supabaseServiceRole }: TaskClaimOptions,
) {
  if (
    task.type !== "chat" ||
    !["finished", "aborted", "error"].includes(task.state)
  )
    return;
  const name = getChatDocumentName(task.parameters);
  if (await isChatDeleted(name, { supabase: supabaseServiceRole })) return;
  const chat = await instance.openDirectConnection(name);
  const persist = (connection: typeof chat) =>
    persistRealtimeDocument(connection.document!, {
      supabase: supabaseServiceRole,
    });

  try {
    const document = chat.document!;
    const state = document.getMap("state");
    if (state.get("generationId") !== task.id) return;
    const interrupted = task.state !== "finished";
    if (interrupted) {
      const current = await instance.openDirectConnection(
        getChatCurrentMessageDocumentName(task.parameters),
      );
      try {
        if (state.get("generationId") !== task.id) return;
        await current.transact((draft) => {
          for (const input of getChatCurrentMessageBatch(draft)
            .toArray()
            .map(normalizeChatCurrentMessage)) {
            if (
              input.content.type === "text" &&
              ["submitted", "queued"].includes(input.state)
            )
              setChatCurrentMessageState(draft, input.id, "paused");
          }
        });
        await persist(current);
      } finally {
        await current.disconnect({ unloadImmediately: false });
      }
    }
    // Recheck after asynchronous loads. Never clear a later generation's state.
    if (state.get("generationId") !== task.id) return;
    await chat.transact((doc) => {
      doc.getMap("cancellations").clear();
      if (
        ["queued", "generating", "aborting"].includes(String(state.get("type")))
      ) {
        setChatState(
          doc,
          task.state === "error"
            ? {
                type: "error",
                generationId: task.id,
                error: "TASK_WORKER_LOST",
              }
            : { type: "idle", generationId: task.id },
        );
      }
    });
    await persist(chat);
    const users = await getAllowedUserIdsByDocumentName(name, {
      supabase: supabaseServiceRole,
      abortSignal: AbortSignal.timeout(10_000),
    });
    for (const userId of users) {
      if (state.get("generationId") !== task.id) break;
      const activities = await instance.openDirectConnection(
        getActivitiesDocumentName({ userId }),
      );
      try {
        if (state.get("generationId") !== task.id) continue;
        await activities.transact((doc) =>
          upsertActivity(doc, {
            id: task.parameters.activityId,
            state:
              task.state === "error"
                ? "error"
                : task.state === "aborted" ||
                    getChatInteraction(
                      getChat(document).messages?.toArray() ?? [],
                    ).type === "tool-approval"
                  ? "idle"
                  : "success",
          }),
        );
        await persist(activities);
      } finally {
        await activities.disconnect({ unloadImmediately: false });
      }
    }
  } finally {
    await chat.disconnect({ unloadImmediately: false });
  }
}
