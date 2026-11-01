import type { UserClaims } from "@schornio/aibox-database/auth/_types";
import type { Storage } from "@schornio/aibox-database/storage/_types";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { requireStorageAccess } from "@schornio/aibox-database/storage/requireStorageAccess";
import {
  validateFileName,
  validateStoragePath,
} from "@schornio/aibox-database/storage/validatePath";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { withStorageFileLock } from "@schornio/aibox-database/storage/withStorageFileLock";
import { transferFile } from "@schornio/aibox-database/storage/transferFile";
import { removeFileIndex } from "@schornio/aibox-database/storage/fileIndex";
import { getDocumentContent } from "@schornio/aibox-database/storage/getDocumentContent";
import { getCurrentUser } from "@schornio/aibox-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-database/user/getCurrentUserClaims";
import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import { StorageRealtimeSession } from "./StorageRealtimeSession.ts";
import { findActiveFileTask } from "./findActiveFileTask.ts";
import { createStorageProcessingTask } from "./createStorageProcessingTask.ts";
import { getTaskQueueDocumentName } from "../taskQueue/_utils.ts";
import { addTask } from "../taskQueue/addTask.ts";
import type { Task } from "../taskQueue/_types.ts";

/** Authorized single-file transfer, shared by web actions and agent tools. */
export async function transferStorageFile(
  input: {
    from: { storage: Storage; path: string };
    to: { storage: Storage; folder: string; name?: string };
    move: boolean;
  },
  {
    supabase,
    authenticatedUser,
    websocketProvider,
    serverToken,
    abortSignal = AbortSignal.timeout(120_000),
  }: {
    supabase: SupabaseClient;
    /** Trusted worker identity matching the client JWT; never tool input. */
    authenticatedUser?: { userId: string; userClaims: UserClaims };
    websocketProvider: ServerRealtimeWebsocketProvider;
    serverToken: `Worker ${string}`;
    abortSignal?: AbortSignal;
  },
) {
  const path = validateStoragePath(input.from.path);
  const folder = validateStoragePath(input.to.folder, { allowRoot: true });
  const name = validateFileName(input.to.name ?? path.split("/").at(-1)!);
  const extension = (value: string) =>
    value.lastIndexOf(".") > 0
      ? value.slice(value.lastIndexOf(".")).toLowerCase()
      : "";
  if (extension(name) !== extension(path.split("/").at(-1)!))
    throw new Error("FILE_EXTENSION_CHANGE_NOT_ALLOWED");
  const destination = [folder, name].filter(Boolean).join("/");
  const accessOptions = {
    supabase,
    ...(authenticatedUser
      ? { authenticatedClaims: authenticatedUser.userClaims }
      : {}),
  };
  await requireStorageAccess(
    input.from.storage,
    input.move ? "write" : "read",
    accessOptions,
  );
  await requireStorageAccess(input.to.storage, "write", accessOptions);
  if (
    StorageSession.getStorageName(input.from.storage.type) ===
      StorageSession.getStorageName(input.to.storage.type) &&
    StorageSession.getStoragePath(path, input.from.storage).storagePath ===
      StorageSession.getStoragePath(destination, input.to.storage).storagePath
  )
    throw new Error("SOURCE_EQUALS_TARGET");
  await using queue = new ServerRealtimeProvider({
    documentName: getTaskQueueDocumentName(),
    serverToken,
    websocketProvider,
    disposalAbortSignal: abortSignal,
  });
  await queue.waitForSynced({
    abortSignal: AbortSignal.any([abortSignal, AbortSignal.timeout(30_000)]),
  });
  for (const [storage, filePath] of [
    [input.from.storage, path],
    [input.to.storage, destination],
  ] as const) {
    if (findActiveFileTask(queue.document, storage, filePath))
      throw new Error("FILE_PROCESSING_IN_PROGRESS");
  }
  const perform = (signal: AbortSignal) =>
    withStorageFileLock(
      input.to.storage,
      destination,
      supabase,
      signal,
      async (lockedSignal) => {
        await using source = new StorageRealtimeSession({
          storage: input.from.storage,
          supabaseStorage: supabase.storage,
          serverToken,
          websocketProvider,
          abortSignal: lockedSignal,
        });
        await using target = new StorageRealtimeSession({
          storage: input.to.storage,
          supabaseStorage: supabase.storage,
          serverToken,
          websocketProvider,
          abortSignal: lockedSignal,
        });
        return transferFile(
          { path, storageSession: source },
          { path: destination, storageSession: target },
          {
            move: input.move,
            beforeRemove: input.move
              ? () => removeFileIndex(path, source, supabase)
              : undefined,
          },
        );
      },
    );
  // Copying requires only source read access. transferFile checks source versions
  // before and after copying; moving additionally holds its source write lease.
  const file = input.move
    ? await withStorageFileLock(
        input.from.storage,
        path,
        supabase,
        abortSignal,
        perform,
      )
    : await perform(abortSignal);
  await using target = new StorageRealtimeSession({
    storage: input.to.storage,
    supabaseStorage: supabase.storage,
    serverToken,
    websocketProvider,
    abortSignal,
  });
  let processing: "ready" | "queued" | "unsupported" | "error" = "ready";
  try {
    const content = await getDocumentContent(destination, target);
    const identity =
      authenticatedUser ??
      (await (async () => {
        const [user, userClaims] = await Promise.all([
          getCurrentUser({ supabaseAuth: supabase.auth }),
          getCurrentUserClaims({ supabaseAuth: supabase.auth }),
        ]);
        return { userId: user.id, userClaims };
      })());
    const parameters = {
      storage: input.to.storage,
      path: destination,
      ...identity,
    };
    let task:
      | Extract<Task, { state: "pending"; type: "process-file" | "transcribe" }>
      | undefined;
    if (content && input.to.storage.type === "documentRepository") {
      task = {
        id: crypto.randomUUID(),
        state: "pending",
        type: "process-file",
        requiredCapabilities: [],
        parameters: { ...parameters, reuseContent: true },
      };
    } else if (!content) {
      task = await createStorageProcessingTask(parameters, { supabase });
      processing = "unsupported";
    }
    if (task) {
      addTask(queue.document, task);
      await queue.waitForSynced({ abortSignal });
      processing = "queued";
      target.logAction({ state: "processing", target: file });
    }
  } catch {
    // File transfer already succeeded. Never retry it blindly or remove its result.
    processing = "error";
    target.logAction({
      state: "error",
      target: file,
      message: "Could not queue target indexing/processing",
    });
  }
  return { file, storage: input.to.storage, processing };
}
