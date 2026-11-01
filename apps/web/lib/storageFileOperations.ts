import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { withStorageFileLock } from "@schornio/aibox-package-database/storage/withStorageFileLock";
import type {
  Storage,
  StorageFileObject,
} from "@schornio/aibox-package-database/storage/_types";
import type { SupabaseClient } from "@schornio/aibox-package-database/_shared/_types";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";
import { findActiveFileTask } from "@schornio/aibox-realtime/documents/storage/findActiveFileTask";
import { createStorageProcessingTask } from "@schornio/aibox-realtime/documents/storage/createStorageProcessingTask";
import { addTask } from "@schornio/aibox-realtime/documents/taskQueue/addTask";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { requireStorageAccess } from "@schornio/aibox-package-database/storage/requireStorageAccess";
import { ensureActivity } from "./ensureActivity";

// Serialize requests on this server before checking the synchronized task queue.
const operations = new Map<string, Promise<unknown>>();
export async function withStorageFileOperation<T>(
  storage: Storage,
  path: string,
  supabase: SupabaseClient,
  action: (context: {
    session: StorageRealtimeSession;
    queue: ServerRealtimeProvider;
  }) => Promise<T>,
  { lock = false }: { lock?: boolean } = {},
) {
  await requireStorageAccess(storage, "write", { supabase });
  const key = `${StorageSession.getStorageName(storage.type)}/${StorageSession.getStoragePath(path, storage).storagePath}`;
  const previous = operations.get(key) ?? Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(async () => {
      const signal = AbortSignal.timeout(30_000);
      const websocketProvider = new ServerRealtimeWebsocketProvider();
      await using queue = new ServerRealtimeProvider({
        documentName: getTaskQueueDocumentName(),
        serverToken: getRealtimeServerToken(),
        websocketProvider,
        disposalAbortSignal: signal,
      });
      await queue.waitForSynced({ abortSignal: signal });
      const perform = async (abortSignal: AbortSignal) => {
        await using session = new StorageRealtimeSession({
          storage,
          supabaseStorage: supabase.storage,
          serverToken: getRealtimeServerToken(),
          websocketProvider,
          abortSignal,
        });
        return action({ session, queue });
      };
      return lock
        ? withStorageFileLock(storage, path, supabase, signal, perform)
        : perform(signal);
    });
  operations.set(key, current);
  try {
    return await current;
  } finally {
    if (operations.get(key) === current) operations.delete(key);
  }
}

export function requireIdleFile(
  queue: ServerRealtimeProvider,
  storage: Storage,
  path: string,
) {
  if (findActiveFileTask(queue.document, storage, path))
    throw new Error("FILE_PROCESSING_IN_PROGRESS");
}

export async function queueFileProcessing(
  target: StorageFileObject,
  {
    session,
    queue,
    supabase,
    useSavedContent = false,
  }: {
    useSavedContent?: boolean;
    session: StorageRealtimeSession;
    queue: ServerRealtimeProvider;
    supabase: SupabaseClient;
  },
) {
  if (findActiveFileTask(queue.document, session.storage, target.path))
    return "alreadyQueued" as const;
  const [user, userClaims] = await Promise.all([
    getCurrentUser({ supabaseAuth: supabase.auth }),
    getCurrentUserClaims({ supabaseAuth: supabase.auth }),
  ]);
  const task = await createStorageProcessingTask(
    {
      useSavedContent,
      path: target.path,
      storage: session.storage,
      userId: user.id,
      userClaims,
    },
    { supabase },
  );
  if (!task) return "unsupported" as const;
  addTask(queue.document, task);
  await queue.waitForSynced({ abortSignal: session.abortSignal });
  session.logAction({ state: "processing", target });
  return "queued" as const;
}

export async function prepareStorageWrite(
  storage: Storage,
  supabase: SupabaseClient,
) {
  if (storage.type !== "documentRepository") {
    // New activities have no document yet; authorize the agent/transcriber first.
    const id =
      storage.type === "activity" ? storage.agentId : storage.transcriberId;
    if (
      ![id, storage.activityId].every((value) => /^[a-zA-Z0-9-]+$/.test(value))
    )
      throw new Error("INVALID_STORAGE");
    const { data, error } = await supabase
      .from(storage.type === "activity" ? "chatbots" : "transcribers")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) throw new Error("STORAGE_NOT_AUTHORIZED");
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });
    await ensureActivity(user.id, storage, {
      labelOnInsert: storage.type === "activity" ? "Chat" : "Transkriptionen",
    });
  }
  await requireStorageAccess(storage, "write", { supabase });
}
