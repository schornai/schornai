import { getTaskChatDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/getTaskChatDocumentName";
import { deleteTask } from "@schornio/aibox-realtime/documents/taskQueue/deleteTask";
import { purgeChatTaskSnapshots } from "@schornio/aibox-database/chat/purgeChatTaskSnapshots";
import { beginChatExpiration } from "@schornio/aibox-database/chat/beginChatExpiration";
import { chatExpirationJobSchema } from "@schornio/aibox-database/chat/expirationSchema";
import type {
  ScheduledJob,
  SchedulerOptions,
} from "@schornio/aibox-database/scheduler/_types";
import { getAllowedUserIdsByDocumentName } from "@schornio/aibox-realtime/_lib/getAllowedUserIdsByDocumentName";
import type { Hocuspocus } from "@hocuspocus/server";
import { persistRealtimeDocument } from "@schornio/aibox-realtime/server/persistRealtimeDocument";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";
import { getTaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/getTaskQueue";
import { requestTaskAbort } from "@schornio/aibox-realtime/documents/taskQueue/requestTaskAbort";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { deleteActivity } from "@schornio/aibox-realtime/documents/activity/deleteActivity";
import { remove } from "@schornio/aibox-database/storage/remove";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { finishChatExpiration } from "@schornio/aibox-database/chat/finishChatExpiration";

/** Idempotent cleanup after an atomic, irreversible tombstone. Subsequent
 * attempts finish interrupted cleanup; expired leases cannot begin deletion. */
export async function expireChat(
  job: ScheduledJob,
  signal: AbortSignal,
  options: SchedulerOptions & { instance: Hocuspocus },
) {
  const { documentName } = chatExpirationJobSchema.parse(job.payload);
  signal.throwIfAborted();
  const parent = await beginChatExpiration(
    documentName,
    job.lease_token!,
    options,
  );
  if (!parent) return;
  const [, activityId, agentId] = /^activity_chat___([^_]+)_(.+)$/.exec(
    documentName,
  )!;
  const userIds = await getAllowedUserIdsByDocumentName(documentName, options);
  const syncSignal = AbortSignal.any([signal, AbortSignal.timeout(45_000)]);
  const queue = await options.instance.openDirectConnection(
    getTaskQueueDocumentName(),
  );
  try {
    const { tasks } = getTaskQueue(queue.document!);
    const active = () =>
      tasks
        .toArray()
        .filter(
          (task) =>
            ["pending", "claimed", "aborting"].includes(task.state) &&
            getTaskChatDocumentName(task) === documentName,
        );
    queue.document!.transact(() => {
      for (const task of active()) requestTaskAbort(queue.document!, task.id);
    });
    await persistRealtimeDocument(queue.document!, options);
    // Wait until owners acknowledge cancellation (or coordinator recovery does).
    // A retry is preferable to deleting files still being used by a live worker.
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        tasks.unobserve(check);
        syncSignal.removeEventListener("abort", abort);
      };
      const check = () => {
        if (!active().length) {
          cleanup();
          resolve();
        }
      };
      const abort = () => {
        cleanup();
        reject(syncSignal.reason);
      };
      tasks.observe(check);
      syncSignal.addEventListener("abort", abort, { once: true });
      if (syncSignal.aborted) abort();
      else check();
    });
    const storage = new StorageSession({
      storage: { type: "activity", activityId: activityId!, agentId: agentId! },
      supabaseStorage: options.supabase.storage,
      abortSignal: syncSignal,
    });
    await remove("", Object.assign(storage, { logAction() {} }), {
      ...options,
      beforeRemove: () => syncSignal.throwIfAborted(),
    });
    for (const userId of userIds) {
      syncSignal.throwIfAborted();
      const history = await options.instance.openDirectConnection(
        getActivitiesDocumentName({ userId }),
      );
      try {
        await history.transact((doc) => deleteActivity(doc, activityId!));
        await persistRealtimeDocument(history.document!, options);
      } finally {
        await history.disconnect({ unloadImmediately: false });
      }
    }
    signal.throwIfAborted();
    await purgeChatTaskSnapshots(documentName, options);
    queue.document!.transact(() => {
      for (const task of tasks.toArray())
        if (getTaskChatDocumentName(task) === documentName)
          deleteTask(queue.document!, task.id);
    });
    await persistRealtimeDocument(queue.document!, options);
    await finishChatExpiration(parent.id, options);
  } finally {
    await queue.disconnect({ unloadImmediately: false });
  }
}
