import type { Storage } from "@schornio/aibox-database/storage/_types";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { UserClaims } from "@schornio/aibox-database/auth/_types";
import { requireStorageAccess } from "@schornio/aibox-database/storage/requireStorageAccess";
import { validateStoragePath } from "@schornio/aibox-database/storage/validatePath";
import { withStorageFileLock } from "@schornio/aibox-database/storage/withStorageFileLock";
import { inspect } from "@schornio/aibox-database/storage/inspect";
import { createFile } from "@schornio/aibox-database/storage/createFile";
import { updateFileText } from "@schornio/aibox-database/storage/updateFileText";
import { getCurrentUser } from "@schornio/aibox-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-database/user/getCurrentUserClaims";
import { getFileCategory } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import { StorageRealtimeSession } from "./StorageRealtimeSession.ts";
import { findActiveFileTask } from "./findActiveFileTask.ts";
import { createStorageProcessingTask } from "./createStorageProcessingTask.ts";
import { getTaskQueueDocumentName } from "../taskQueue/_utils.ts";
import { addTask } from "../taskQueue/addTask.ts";

/** Authorized text edits shared by the editor and agent tool. Omit expectedText only for intentional overwrites. */
export async function writeStorageFileText(
  input: {
    storage: Storage;
    path: string;
    text: string;
    expectedText?: string;
    createIfMissing?: boolean;
  },
  {
    supabase,
    authenticatedUser,
    websocketProvider,
    serverToken,
    abortSignal = AbortSignal.timeout(30_000),
  }: {
    supabase: SupabaseClient;
    /** Trusted worker identity matching the client JWT; never tool input. */
    authenticatedUser?: { userId: string; userClaims: UserClaims };
    websocketProvider: ServerRealtimeWebsocketProvider;
    serverToken: `Worker ${string}`;
    abortSignal?: AbortSignal;
  },
) {
  const path = validateStoragePath(input.path);
  if (new TextEncoder().encode(input.text).byteLength > 1024 * 1024)
    throw new Error("TEXT_FILE_TOO_LARGE");
  await requireStorageAccess(input.storage, "write", {
    supabase,
    ...(authenticatedUser
      ? { authenticatedClaims: authenticatedUser.userClaims }
      : {}),
  });
  await using queue = new ServerRealtimeProvider({
    documentName: getTaskQueueDocumentName(),
    serverToken,
    websocketProvider,
    disposalAbortSignal: abortSignal,
  });
  await queue.waitForSynced({
    abortSignal: AbortSignal.any([abortSignal, AbortSignal.timeout(30_000)]),
  });
  const result = await withStorageFileLock(
    input.storage,
    path,
    supabase,
    abortSignal,
    async (signal) => {
      if (findActiveFileTask(queue.document, input.storage, path))
        throw new Error("FILE_PROCESSING_IN_PROGRESS");
      await using session = new StorageRealtimeSession({
        storage: input.storage,
        supabaseStorage: supabase.storage,
        serverToken,
        websocketProvider,
        abortSignal: signal,
      });
      const existing = await inspect(path, session);
      if (existing?.folder) throw new Error("TARGET_IS_FOLDER");
      if (!existing && !input.createIfMissing)
        throw new Error("FILE_NOT_FOUND");
      const result = existing
        ? await updateFileText(
            { path, text: input.text, expectedText: input.expectedText },
            { session },
          )
        : await (async () => {
            if (!["plain-text", "code"].includes(getFileCategory(path)))
              throw new Error("UNSUPPORTED_NEW_TEXT_FILE");
            const parents = path.split("/").slice(0, -1);
            for (let length = 1; length <= parents.length; length++) {
              if (
                (await inspect(parents.slice(0, length).join("/"), session))
                  ?.file
              )
                throw new Error("TARGET_FOLDER_IS_FILE");
            }
            const file = await createFile(
              new Blob([input.text], { type: "text/plain;charset=utf-8" }),
              path,
              session,
              { upsert: false },
            );
            return { status: "saved" as const, file };
          })();
      return result;
    },
  );
  // Release the write lease before publishing work: a fast worker must be able to acquire it.
  if (result.status !== "saved") return result;
  let indexQueued = true;
  if (input.storage.type === "documentRepository") {
    await using session = new StorageRealtimeSession({
      storage: input.storage,
      supabaseStorage: supabase.storage,
      serverToken,
      websocketProvider,
      abortSignal,
    });
    try {
      const identity =
        authenticatedUser ??
        (await (async () => {
          const [user, userClaims] = await Promise.all([
            getCurrentUser({ supabaseAuth: supabase.auth }),
            getCurrentUserClaims({ supabaseAuth: supabase.auth }),
          ]);
          return { userId: user.id, userClaims };
        })());
      const task = await createStorageProcessingTask(
        {
          storage: input.storage,
          path,
          useSavedContent: true,
          ...identity,
        },
        { supabase },
      );
      if (!task) throw new Error("INDEX_TASK_UNAVAILABLE");
      abortSignal.throwIfAborted();
      addTask(queue.document, task);
      await queue.waitForSynced({ abortSignal });
      session.logAction({ state: "processing", target: result.file });
    } catch {
      indexQueued = false;
    }
  }
  return { ...result, indexQueued };
}
