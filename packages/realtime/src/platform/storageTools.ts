import { limitPlatformClaims } from "@schornio/aibox-database/mcp/platformAccess";
import { getWorkspaces } from "@schornio/aibox-database/workspace/getWorkspaces";
import {
  storageSchema,
  transcriptionSegmentSchema,
} from "@schornio/aibox-database/storage/_schemas";
import type { Storage } from "@schornio/aibox-database/storage/_types";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { getTranscriberById } from "@schornio/aibox-database/transcriber/getTranscriberById";
import { withStorageFileLock } from "@schornio/aibox-database/storage/withStorageFileLock";
import { updateTranscriptionSegment } from "@schornio/aibox-database/storage/updateTranscriptionSegment";
import { aiboxModelEmbedding } from "../_lib/aiboxModelEmbedding.ts";
import { StorageRealtimeSession } from "../documents/storage/StorageRealtimeSession.ts";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import { getTaskQueueDocumentName } from "../documents/taskQueue/_utils.ts";
import { addTask } from "../documents/taskQueue/addTask.ts";
import { findActiveFileTask } from "../documents/storage/findActiveFileTask.ts";
import { createStorageProcessingTask } from "../documents/storage/createStorageProcessingTask.ts";
import { transferStorageFile } from "../documents/storage/transferStorageFile.ts";
import { createFolder } from "@schornio/aibox-database/storage/createFolder";
import { createFile } from "@schornio/aibox-database/storage/createFile";
import { remove } from "@schornio/aibox-database/storage/remove";
import { inspect } from "@schornio/aibox-database/storage/inspect";
import { z } from "zod";
import type { platformRegistry, PlatformContext } from "./registry.ts";
import { getDocumentRepositoryById } from "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById";
import { searchDocuments } from "@schornio/aibox-database/documentRepositories/searchDocuments";
import { requireStorageAccess } from "@schornio/aibox-database/storage/requireStorageAccess";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { list } from "@schornio/aibox-database/storage/list";
import { getDocumentContent } from "@schornio/aibox-database/storage/getDocumentContent";
import { validateStoragePath } from "@schornio/aibox-database/storage/validatePath";
import { writeStorageFileText } from "../documents/storage/writeStorageFileText.ts";

export function addStorageTools(
  context: PlatformContext,
  registry: ReturnType<typeof platformRegistry>,
) {
  const { workspace } = registry;
  const add: typeof registry.add = (
    name,
    description,
    level,
    readOnly,
    schema,
    run,
  ) => {
    registry.add(name, description, level, readOnly, schema, run);
    if (level !== "editor") return;
    registry.add(
      name.replace("platform_", "platform_activity_"),
      description +
        " This user-level variant only accepts chat/transcription activity storage, never a repository.",
      "user",
      readOnly,
      schema,
      async (input) => {
        const value = input as {
          storage?: Storage;
          repositoryId?: string;
          from?: { storage?: Storage; repositoryId?: string };
          to?: { storage?: Storage; repositoryId?: string };
        };
        for (const target of value.from && value.to
          ? [value.from, value.to]
          : [value]) {
          if (
            target.repositoryId ||
            !target.storage ||
            target.storage.type === "documentRepository"
          )
            throw new Error("ACTIVITY_STORAGE_REQUIRED");
        }
        return run(input);
      },
    );
  };
  const { supabase } = context;
  const location = {
    repositoryId: z.string().min(1).optional(),
    storage: z.optional(storageSchema),
  };
  const file = z.object({ ...location, path: z.string() });
  async function storageFor(
    input: { repositoryId?: string; storage?: Storage },
    write: boolean,
  ) {
    if (input.repositoryId && input.storage)
      throw new Error("AMBIGUOUS_STORAGE");
    if (input.storage && input.storage.type !== "documentRepository") {
      const storage = input.storage;
      const owner =
        storage.type === "activity"
          ? await getAgentById(storage.agentId, { supabase })
          : await getTranscriberById(storage.transcriberId, { supabase });
      workspace("user", owner.workspaceId);
      await requireStorageAccess(storage, write ? "write" : "read", {
        supabase,
        authenticatedClaims: context.claims,
      });
      return storage;
    }
    const repositoryId =
      input.repositoryId ??
      (input.storage?.type === "documentRepository"
        ? input.storage.documentRepositoryId
        : undefined);
    if (!repositoryId) throw new Error("STORAGE_REQUIRED");
    const repository = await getDocumentRepositoryById(repositoryId, {
      supabase,
    });
    workspace(write ? "editor" : "user", repository.workspaceId);
    const storage = {
      type: "documentRepository" as const,
      documentRepositoryId: repository.id,
      workspaceId: repository.workspaceId,
    };
    await requireStorageAccess(storage, write ? "write" : "read", {
      supabase,
      authenticatedClaims: context.claims,
    });
    return storage;
  }
  add(
    "platform_files_list",
    "List files and folders in authorized repository or activity storage. Use an empty path for its root.",
    "user",
    true,
    file,
    async ({ repositoryId, storage: suppliedStorage, path }) => {
      const storage = await storageFor(
        { repositoryId, storage: suppliedStorage },
        false,
      );
      if (path) validateStoragePath(path);
      return list(
        path,
        new StorageSession({ storage, supabaseStorage: supabase.storage }),
      );
    },
  );
  add(
    "platform_file_read",
    "Read extracted text, text file history, or transcript segments from authorized repository or activity storage.",
    "user",
    true,
    file,
    async ({ repositoryId, storage: suppliedStorage, path }) => {
      const storage = await storageFor(
        { repositoryId, storage: suppliedStorage },
        false,
      );
      return (
        (await getDocumentContent(
          validateStoragePath(path),
          new StorageSession({ storage, supabaseStorage: supabase.storage }),
        )) ?? { status: "content_unavailable" }
      );
    },
  );
  add(
    "platform_documents_search",
    "Search indexed repository documents by keywords and optional semantic query using the configured indexes.",
    "user",
    true,
    z.object({
      repositoryId: z.string().min(1),
      keywords: z.array(z.string().min(1)).max(30).default([]),
      semantic: z.string().max(10000).optional(),
      limit: z.number().int().min(1).max(100).default(20),
      skip: z.number().int().min(0).default(0),
    }),
    async ({ repositoryId, keywords, semantic, limit, skip }) => {
      await storageFor({ repositoryId }, false);
      const repository = await getDocumentRepositoryById(repositoryId, {
        supabase,
      });
      return searchDocuments(
        repository,
        { keywords, semantic },
        {
          supabase,
          limit,
          skip,
          embeddingModel: (modelId) =>
            aiboxModelEmbedding(modelId, {
              serverToken: context.serverToken,
              websocketProvider: context.websocketProvider,
            }),
        },
      );
    },
  );
  add(
    "platform_file_write",
    "Create or update a text file in authorized storage. For updates pass the previous text as expectedText to detect conflicts. Saves history and queues indexing.",
    "editor",
    false,
    file.extend({
      text: z.string().max(1024 * 1024),
      expectedText: z
        .string()
        .max(1024 * 1024)
        .optional(),
      createIfMissing: z.boolean().default(false),
    }),
    async ({ repositoryId, storage: suppliedStorage, ...input }) => {
      const storage = await storageFor(
        { repositoryId, storage: suppliedStorage },
        true,
      );
      return writeStorageFileText(
        { ...input, storage },
        {
          supabase,
          authenticatedUser: {
            userId: context.userId,
            userClaims: context.claims,
          },
          serverToken: context.serverToken,
          websocketProvider: context.websocketProvider,
        },
      );
    },
  );
  add(
    "platform_file_transfer",
    "Copy, move or rename a file between permitted storage locations. Extension changes and overwriting existing targets are rejected.",
    "editor",
    false,
    z.object({
      from: file,
      to: z.object({
        ...location,
        folder: z.string(),
        name: z.string().optional(),
      }),
      move: z.boolean().default(false),
    }),
    async (input) => {
      const from = await storageFor(input.from, input.move);
      const to = await storageFor(input.to, true);
      return transferStorageFile(
        {
          from: { storage: from, path: input.from.path },
          to: { storage: to, folder: input.to.folder, name: input.to.name },
          move: input.move,
        },
        {
          supabase,
          authenticatedUser: {
            userId: context.userId,
            userClaims: context.claims,
          },
          serverToken: context.serverToken,
          websocketProvider: context.websocketProvider,
        },
      );
    },
  );
  async function withSession<T>(
    location: { repositoryId?: string; storage?: Storage },
    run: (
      session: StorageRealtimeSession,
      queue: ServerRealtimeProvider,
    ) => Promise<T>,
  ) {
    const storage = await storageFor(location, true);
    const signal = AbortSignal.timeout(60_000);
    await using queue = new ServerRealtimeProvider({
      documentName: getTaskQueueDocumentName(),
      serverToken: context.serverToken,
      websocketProvider: context.websocketProvider,
      disposalAbortSignal: signal,
    });
    await queue.waitForSynced({ abortSignal: signal });
    await using session = new StorageRealtimeSession({
      storage,
      supabaseStorage: supabase.storage,
      serverToken: context.serverToken,
      websocketProvider: context.websocketProvider,
      abortSignal: signal,
    });
    return run(session, queue);
  }
  function requireIdle(
    session: StorageRealtimeSession,
    queue: ServerRealtimeProvider,
    path: string,
  ) {
    if (findActiveFileTask(queue.document, session.storage, path))
      throw new Error("FILE_PROCESSING_IN_PROGRESS");
  }
  async function processFile(
    path: string,
    session: StorageRealtimeSession,
    queue: ServerRealtimeProvider,
  ) {
    requireIdle(session, queue, path);
    const target = await inspect(path, session);
    if (!target?.file) throw new Error("FILE_NOT_FOUND");
    const task = await createStorageProcessingTask(
      {
        path,
        storage: session.storage,
        userId: context.userId,
        userClaims: limitPlatformClaims(
          context.claims,
          context.level,
          context.claims === "admin" && context.level !== "admin"
            ? (await getWorkspaces({ supabase })).map((w) => w.id)
            : [],
        ),
      },
      { supabase },
    );
    if (!task) return { status: "unsupported" };
    addTask(queue.document, task);
    await queue.waitForSynced({ abortSignal: session.abortSignal });
    session.logAction({ state: "processing", target });
    return { status: "queued", taskId: task.id };
  }
  add(
    "platform_folder_create",
    "Create a folder in authorized storage.",
    "editor",
    false,
    file,
    async ({ repositoryId, storage: suppliedStorage, path }) =>
      withSession(
        { repositoryId, storage: suppliedStorage },
        async (session) => {
          await createFolder(validateStoragePath(path), session);
          return { path };
        },
      ),
  );
  add(
    "platform_file_delete",
    "Permanently delete a file or recursively delete a folder and its indexes. Processing files cannot be removed.",
    "editor",
    false,
    file,
    async ({ repositoryId, storage: suppliedStorage, path }) =>
      withSession(
        { repositoryId, storage: suppliedStorage },
        async (session, queue) => {
          await remove(validateStoragePath(path), session, {
            supabase,
            beforeRemove: (target) => requireIdle(session, queue, target),
          });
          return { path };
        },
      ),
  );
  add(
    "platform_file_process",
    "Queue extraction, indexing or transcription for a stored file using its configured transcriber.",
    "editor",
    false,
    file,
    async ({ repositoryId, storage: suppliedStorage, path }) =>
      withSession(
        { repositoryId, storage: suppliedStorage },
        (session, queue) =>
          processFile(validateStoragePath(path), session, queue),
      ),
  );
  add(
    "platform_file_upload",
    "Upload a new base64-encoded file (up to 1 MiB) and queue extraction or transcription when supported. Existing files are never overwritten.",
    "editor",
    false,
    file.extend({
      base64: z
        .string()
        .max(1_398_104)
        .regex(
          /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
        ),
      mimeType: z.string().max(200).default("application/octet-stream"),
    }),
    async ({
      repositoryId,
      storage: suppliedStorage,
      path,
      base64,
      mimeType,
    }) =>
      withSession(
        { repositoryId, storage: suppliedStorage },
        async (session, queue) => {
          path = validateStoragePath(path);
          requireIdle(session, queue, path);
          const bytes = Buffer.from(base64, "base64");
          if (bytes.length > 1024 * 1024) throw new Error("FILE_TOO_LARGE");
          await createFile(
            new Blob([bytes], { type: mimeType }),
            path,
            session,
            {
              upsert: false,
            },
          );
          return { path, processing: await processFile(path, session, queue) };
        },
      ),
  );
  add(
    "platform_file_download",
    "Get a short-lived download URL for an authorized original file, including audio or binary content.",
    "user",
    true,
    file,
    async ({ repositoryId, storage: suppliedStorage, path }) => {
      const storage = await storageFor(
        { repositoryId, storage: suppliedStorage },
        false,
      );
      const session = new StorageSession({
        storage,
        supabaseStorage: supabase.storage,
      });
      const { data, error } = await session.supabaseStorage.createSignedUrl(
        session.getStoragePath(validateStoragePath(path)).storagePath,
        60,
      );
      if (error || !data) throw new Error("DOWNLOAD_FAILED");
      return { url: data.signedUrl, expiresIn: 60 };
    },
  );
  add(
    "platform_transcription_segment_update",
    "Correct or review a transcript segment using the previously read segment for conflict detection. Holds the same file lease as the editor.",
    "editor",
    false,
    file.extend({
      segmentIndex: z.number().int().min(0),
      expectedSegment: transcriptionSegmentSchema,
      text: z.string().max(100000).nullable(),
      reviewed: z.boolean(),
    }),
    async ({ repositoryId, storage: suppliedStorage, ...input }) =>
      withSession(
        { repositoryId, storage: suppliedStorage },
        async (session, queue) => {
          input.path = validateStoragePath(input.path);
          return withStorageFileLock(
            session.storage,
            input.path,
            supabase,
            session.abortSignal,
            async () => {
              requireIdle(session, queue, input.path);
              return updateTranscriptionSegment(input, { session });
            },
          );
        },
      ),
  );

  add(
    "platform_file_upload_url",
    "Create a signed upload URL for a new file without the inline base64 size limit. Upload the bytes, then call platform_file_process (or its activity variant) to extract/index/transcribe.",
    "editor",
    false,
    file,
    async ({ repositoryId, storage: suppliedStorage, path }) => {
      const storage = await storageFor(
        { repositoryId, storage: suppliedStorage },
        true,
      );
      const session = new StorageSession({
        storage,
        supabaseStorage: supabase.storage,
      });
      const { data, error } =
        await session.supabaseStorage.createSignedUploadUrl(
          session.getStoragePath(validateStoragePath(path)).storagePath,
          { upsert: false },
        );
      if (error || !data) throw new Error("UPLOAD_URL_FAILED");
      return { storage, path, signedUrl: data.signedUrl, token: data.token };
    },
  );
}
