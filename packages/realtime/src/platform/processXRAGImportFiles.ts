import { getTaskClaims } from "@schornio/aibox-database/task/getTaskClaims";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { readImport } from "@schornio/aibox-database/xrag/importTransaction";
import { getExportWorkerOptions } from "@schornio/aibox-database/xrag/getExportWorkerOptions";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import { ServerRealtimeWebsocketProvider } from "../server/ServerRealtimeWebsocketProvider.ts";
import { getTaskQueueDocumentName } from "../documents/taskQueue/_utils.ts";
import { getTaskQueue } from "../documents/taskQueue/getTaskQueue.ts";
import { addTask } from "../documents/taskQueue/addTask.ts";
import { createStorageProcessingTask } from "../documents/storage/createStorageProcessingTask.ts";

/** Durable scheduler delivery; web/MCP import success no longer depends on Yjs.
 * Stable task IDs avoid duplicate publication after a lost acknowledgement. */
export async function processXRAGImportFiles(
  id: string,
  {
    supabase,
    serverToken,
    signal,
  }: {
    supabase: SupabaseClient;
    serverToken: `Worker ${string}`;
    signal: AbortSignal;
  },
) {
  const job = await readImport(id, supabase);
  if (job.state !== "committed") throw new Error("XRAG_IMPORT_NOT_COMMITTED");
  const options = await getExportWorkerOptions(
    job.user_id,
    job.plan.claims,
    supabase,
    signal,
  );
  await using queue = new ServerRealtimeProvider({
    documentName: getTaskQueueDocumentName(),
    serverToken,
    websocketProvider: new ServerRealtimeWebsocketProvider(),
  });
  await queue.waitForSynced({ abortSignal: signal });
  const { tasks } = getTaskQueue(queue.document);
  const claimed = new Set<string>();
  for (let index = 0; index < job.plan.processing.length; index += 100) {
    const claims = await getTaskClaims(
      job.plan.processing.slice(index, index + 100).map((file) => file.id),
      { supabaseServiceRole: supabase },
    );
    for (const claim of claims) claimed.add(claim.task_id);
  }
  for (const file of job.plan.processing) {
    signal.throwIfAborted();
    if (
      claimed.has(file.id) ||
      tasks.toArray().some((task) => task.id === file.id)
    )
      continue;
    const task = await createStorageProcessingTask(
      {
        ...file,
        userId: job.user_id,
        userClaims: options.authenticated!.claims,
      },
      { supabase: options.supabase },
    );
    if (task) addTask(queue.document, { ...task, id: file.id });
  }
  await queue.waitForSynced({ abortSignal: signal });
}
