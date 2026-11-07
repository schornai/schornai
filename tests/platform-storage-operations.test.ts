import { beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
const io = vi.hoisted(() => ({
  docs: new Map<string, any>(),
  access: vi.fn(),
  repository: vi.fn(),
  agent: vi.fn(),
  transcriber: vi.fn(),
  workspaces: vi.fn(),
  list: vi.fn(),
  read: vi.fn(),
  search: vi.fn(),
  embedding: vi.fn(),
  write: vi.fn(),
  transfer: vi.fn(),
  folder: vi.fn(),
  remove: vi.fn(),
  inspect: vi.fn(),
  processing: vi.fn(),
  active: vi.fn(),
  create: vi.fn(),
  lock: vi.fn(),
  segment: vi.fn(),
  log: vi.fn(),
  signed: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@schornio/aibox-database/storage/requireStorageAccess", () => ({
  requireStorageAccess: io.access,
}));
vi.mock(
  "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById",
  () => ({ getDocumentRepositoryById: io.repository }),
);
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: io.agent,
}));
vi.mock("@schornio/aibox-database/transcriber/getTranscriberById", () => ({
  getTranscriberById: io.transcriber,
}));
vi.mock("@schornio/aibox-database/workspace/getWorkspaces", () => ({
  getWorkspaces: io.workspaces,
}));
vi.mock("@schornio/aibox-database/storage/list", () => ({ list: io.list }));
vi.mock("@schornio/aibox-database/storage/getDocumentContent", () => ({
  getDocumentContent: io.read,
}));
vi.mock(
  "@schornio/aibox-database/documentRepositories/searchDocuments",
  () => ({ searchDocuments: io.search }),
);
vi.mock("../packages/realtime/src/_lib/aiboxModelEmbedding.ts", () => ({
  aiboxModelEmbedding: io.embedding,
}));
vi.mock(
  "../packages/realtime/src/documents/storage/writeStorageFileText.ts",
  () => ({ writeStorageFileText: io.write }),
);
vi.mock(
  "../packages/realtime/src/documents/storage/transferStorageFile.ts",
  () => ({ transferStorageFile: io.transfer }),
);
vi.mock(
  "../packages/realtime/src/documents/storage/findActiveFileTask.ts",
  () => ({ findActiveFileTask: io.active }),
);
vi.mock(
  "../packages/realtime/src/documents/storage/createStorageProcessingTask.ts",
  () => ({ createStorageProcessingTask: io.processing }),
);
vi.mock("@schornio/aibox-database/storage/createFolder", () => ({
  createFolder: io.folder,
}));
vi.mock("@schornio/aibox-database/storage/remove", () => ({
  remove: io.remove,
}));
vi.mock("@schornio/aibox-database/storage/inspect", () => ({
  inspect: io.inspect,
}));
vi.mock("@schornio/aibox-database/storage/createFile", () => ({
  createFile: io.create,
}));
vi.mock("@schornio/aibox-database/storage/withStorageFileLock", () => ({
  withStorageFileLock: io.lock,
}));
vi.mock("@schornio/aibox-database/storage/updateTranscriptionSegment", () => ({
  updateTranscriptionSegment: io.segment,
}));
vi.mock(
  "../packages/realtime/src/server/ServerRealtimeProvider.ts",
  async () => {
    const { Doc } = await import("yjs");
    return {
      ServerRealtimeProvider: class {
        document: any;
        constructor({ documentName }: any) {
          if (!io.docs.has(documentName)) io.docs.set(documentName, new Doc());
          this.document = io.docs.get(documentName);
        }
        async waitForSynced() {}
        async [Symbol.asyncDispose]() {}
      },
    };
  },
);
vi.mock(
  "../packages/realtime/src/documents/storage/StorageRealtimeSession.ts",
  async () => {
    const { StorageSession } =
      await import("../packages/database/src/storage/_utils/StorageSession.ts");
    return {
      StorageRealtimeSession: class extends StorageSession {
        logAction = io.log;
        async [Symbol.asyncDispose]() {}
      },
    };
  },
);
import { addStorageTools } from "../packages/realtime/src/platform/storageTools.ts";
import {
  platformRegistry,
  type PlatformContext,
} from "../packages/realtime/src/platform/registry.ts";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue.ts";
const activity = {
  type: "activity" as const,
  agentId: "agent",
  activityId: "activity",
};
const transcript = {
  type: "activity-transcription" as const,
  transcriberId: "transcriber",
  activityId: "activity",
};
const repository = {
  type: "documentRepository" as const,
  documentRepositoryId: "repo",
  workspaceId: "workspace",
};
const supabase = {
  storage: {
    from: vi.fn(() => ({
      createSignedUrl: io.signed,
      createSignedUploadUrl: io.upload,
    })),
  },
} as any;
function context(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    userId: "user",
    level: "admin",
    claims: "admin",
    supabase,
    supabaseServiceRole: {} as any,
    serverToken: "Worker test",
    websocketProvider: {} as any,
    ...overrides,
  };
}
function execute(name: string, input: unknown, c = context()) {
  const r = platformRegistry(c);
  addStorageTools(c, r);
  return r.tools.find((t) => t.name === name)!.execute(input);
}
beforeEach(() => {
  vi.clearAllMocks();
  io.docs.clear();
  io.active.mockReturnValue(undefined);
  io.repository.mockResolvedValue({ id: "repo", workspaceId: "workspace" });
  io.agent.mockResolvedValue({ workspaceId: "workspace" });
  io.transcriber.mockResolvedValue({ workspaceId: "workspace" });
  io.workspaces.mockResolvedValue([{ id: "workspace" }]);
  io.inspect.mockResolvedValue({ file: true, path: "file.md" });
  io.processing.mockResolvedValue({
    id: "task",
    type: "process-file",
    state: "pending",
    parameters: {},
  });
  io.read.mockResolvedValue({ type: "mdc", current: "Read" });
  io.lock.mockImplementation(async (_s, _p, _db, _signal, run) => run());
  io.remove.mockImplementation(async (path, _session, options) =>
    options.beforeRemove(path),
  );
  io.signed.mockResolvedValue({
    data: { signedUrl: "https://download.test" },
    error: null,
  });
  io.upload.mockResolvedValue({
    data: { signedUrl: "https://upload.test", token: "upload-token" },
    error: null,
  });
});
describe("platform storage workflows", () => {
  it.each([
    { repositoryId: "repo" },
    { storage: repository },
    { storage: activity },
    { storage: transcript },
  ])("reads only authorized storage with %j", async (location) => {
    io.list.mockResolvedValue([{ name: "file.md" }]);
    expect(
      await execute("platform_files_list", { ...location, path: "" }),
    ).toEqual([{ name: "file.md" }]);
    expect(
      await execute("platform_file_read", { ...location, path: "file.md" }),
    ).toEqual({ type: "mdc", current: "Read" });
    expect(io.access).toHaveBeenCalledWith(
      expect.objectContaining({
        type: location.storage?.type ?? "documentRepository",
      }),
      "read",
      { supabase, authenticatedClaims: "admin" },
    );
    expect(io.read).toHaveBeenCalledWith(
      "file.md",
      expect.objectContaining({ storage: expect.anything() }),
    );
  });
  it("lists nested folders and reports missing extraction without pretending the file is empty", async () => {
    await execute("platform_files_list", {
      repositoryId: "repo",
      path: "folder",
    });
    expect(io.list).toHaveBeenCalledWith("folder", expect.anything());
    io.read.mockResolvedValue(undefined);
    expect(
      await execute("platform_file_read", {
        repositoryId: "repo",
        path: "file.pdf",
      }),
    ).toEqual({ status: "content_unavailable" });
  });
  it.each([
    [{}, "STORAGE_REQUIRED"],
    [{ repositoryId: "repo", storage: activity }, "AMBIGUOUS_STORAGE"],
  ])("rejects ambiguous or missing locations", async (location, error) => {
    await expect(
      execute("platform_files_list", { ...(location as object), path: "" }),
    ).rejects.toThrow(String(error));
    expect(io.list).not.toHaveBeenCalled();
  });
  it("preserves conflict detection and caller identity when writing", async () => {
    io.write.mockResolvedValue({ status: "conflict" });
    expect(
      await execute("platform_file_write", {
        repositoryId: "repo",
        path: "file.md",
        text: "New",
        expectedText: "Old",
      }),
    ).toEqual({ status: "conflict" });
    expect(io.write).toHaveBeenCalledWith(
      {
        storage: repository,
        path: "file.md",
        text: "New",
        expectedText: "Old",
        createIfMissing: false,
      },
      expect.objectContaining({
        supabase,
        authenticatedUser: { userId: "user", userClaims: "admin" },
      }),
    );
    expect(io.access).toHaveBeenCalledWith(
      repository,
      "write",
      expect.anything(),
    );
  });
  it.each([false, true])(
    "requires source write access only for a move (%s)",
    async (move) => {
      await execute("platform_file_transfer", {
        from: { repositoryId: "repo", path: "old.md" },
        to: { storage: activity, folder: "target", name: "new.md" },
        move,
      });
      expect(io.access).toHaveBeenNthCalledWith(
        1,
        repository,
        move ? "write" : "read",
        expect.anything(),
      );
      expect(io.access).toHaveBeenNthCalledWith(
        2,
        activity,
        "write",
        expect.anything(),
      );
      expect(io.transfer).toHaveBeenCalledWith(
        {
          from: { storage: repository, path: "old.md" },
          to: { storage: activity, folder: "target", name: "new.md" },
          move,
        },
        expect.anything(),
      );
    },
  );
  it("uses the shared search engine, pagination and model connection", async () => {
    io.embedding.mockReturnValue("embedding");
    io.search.mockImplementation(async (_r, _q, options) => {
      expect(options.limit).toBe(3);
      expect(options.skip).toBe(2);
      expect(options.embeddingModel("model")).toBe("embedding");
      return ["hit"];
    });
    expect(
      await execute("platform_documents_search", {
        repositoryId: "repo",
        keywords: ["term"],
        semantic: "query",
        limit: 3,
        skip: 2,
      }),
    ).toEqual(["hit"]);
  });
  it("creates folders and prevents deleting processing files", async () => {
    expect(
      await execute("platform_folder_create", {
        repositoryId: "repo",
        path: "folder",
      }),
    ).toEqual({ path: "folder" });
    expect(io.folder).toHaveBeenCalledWith("folder", expect.anything());
    expect(
      await execute("platform_file_delete", {
        repositoryId: "repo",
        path: "file.md",
      }),
    ).toEqual({ path: "file.md" });
    io.active.mockReturnValue({ id: "active" });
    await expect(
      execute("platform_file_delete", {
        repositoryId: "repo",
        path: "file.md",
      }),
    ).rejects.toThrow("FILE_PROCESSING_IN_PROGRESS");
  });
  it("queues processing with a capped delegated role and refuses duplicate work", async () => {
    const c = context({ level: "editor" });
    expect(
      await execute(
        "platform_file_process",
        { repositoryId: "repo", path: "file.md" },
        c,
      ),
    ).toEqual({ status: "queued", taskId: "task" });
    expect(io.processing).toHaveBeenCalledWith(
      expect.objectContaining({
        userClaims: [{ organization_id: "workspace", role: "editor" }],
      }),
      { supabase },
    );
    expect(getTaskQueue(io.docs.get("taskQueue")).tasks.toArray()).toHaveLength(
      1,
    );
    expect(io.log).toHaveBeenCalledWith(
      expect.objectContaining({ state: "processing" }),
    );
    io.active.mockReturnValue({ id: "active" });
    await expect(
      execute("platform_file_process", {
        repositoryId: "repo",
        path: "file.md",
      }),
    ).rejects.toThrow("FILE_PROCESSING_IN_PROGRESS");
  });
  it("distinguishes absent files from unsupported processing formats", async () => {
    io.inspect.mockResolvedValue({ folder: true });
    await expect(
      execute("platform_file_process", {
        repositoryId: "repo",
        path: "folder",
      }),
    ).rejects.toThrow("FILE_NOT_FOUND");
    io.inspect.mockResolvedValue({ file: true });
    io.processing.mockResolvedValue(undefined);
    expect(
      await execute("platform_file_process", {
        repositoryId: "repo",
        path: "file.bin",
      }),
    ).toEqual({ status: "unsupported" });
  });
  it("uploads bytes without overwriting, then queues processing", async () => {
    expect(
      await execute("platform_file_upload", {
        repositoryId: "repo",
        path: "file.md",
        base64: "eA==",
        mimeType: "text/markdown",
      }),
    ).toEqual({
      path: "file.md",
      processing: { status: "queued", taskId: "task" },
    });
    const [blob, path, , options] = io.create.mock.calls[0];
    expect(await blob.text()).toBe("x");
    expect(path).toBe("file.md");
    expect(options).toEqual({ upsert: false });
  });
  it("rejects uploads that decode above the inline limit", async () => {
    await expect(
      execute("platform_file_upload", {
        repositoryId: "repo",
        path: "file.md",
        base64: Buffer.alloc(1024 * 1024 + 1).toString("base64"),
      }),
    ).rejects.toThrow("FILE_TOO_LARGE");
    expect(io.create).not.toHaveBeenCalled();
  });
  it("creates short-lived download and non-overwriting upload URLs", async () => {
    expect(
      await execute("platform_file_download", {
        repositoryId: "repo",
        path: "file.md",
      }),
    ).toEqual({ url: "https://download.test", expiresIn: 60 });
    expect(io.signed).toHaveBeenCalledWith(
      expect.stringContaining("file.md"),
      60,
    );
    expect(
      await execute("platform_file_upload_url", {
        repositoryId: "repo",
        path: "file.md",
      }),
    ).toMatchObject({ path: "file.md", token: "upload-token" });
    expect(io.upload).toHaveBeenCalledWith(expect.stringContaining("file.md"), {
      upsert: false,
    });
  });
  it.each([
    { data: null, error: null },
    { data: {}, error: new Error("storage error") },
  ])("fails closed when signing a file URL fails", async (result) => {
    io.signed.mockResolvedValue(result);
    io.upload.mockResolvedValue(result);
    await expect(
      execute("platform_file_download", {
        repositoryId: "repo",
        path: "file.md",
      }),
    ).rejects.toThrow("DOWNLOAD_FAILED");
    await expect(
      execute("platform_file_upload_url", {
        repositoryId: "repo",
        path: "file.md",
      }),
    ).rejects.toThrow("UPLOAD_URL_FAILED");
  });
  it("holds the file lease and forwards the expected transcript segment", async () => {
    const expectedSegment = {
      noSpeechProbability: 0,
      timeStart: 0,
      timeEnd: 1,
      words: [],
    };
    io.segment.mockResolvedValue({ status: "saved" });
    expect(
      await execute("platform_transcription_segment_update", {
        storage: transcript,
        path: "audio.mp3",
        segmentIndex: 0,
        expectedSegment,
        text: "Corrected",
        reviewed: true,
      }),
    ).toEqual({ status: "saved" });
    expect(io.lock).toHaveBeenCalledWith(
      transcript,
      "audio.mp3",
      supabase,
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(io.segment).toHaveBeenCalledWith(
      expect.objectContaining({ expectedSegment, text: "Corrected" }),
      expect.anything(),
    );
  });
  it("allows user-level activity writes but never repository targets or disguised transfers", async () => {
    const c = context({ level: "user" });
    await execute(
      "platform_activity_file_write",
      { storage: activity, path: "file.md", text: "New" },
      c,
    );
    expect(io.write).toHaveBeenCalled();
    await execute(
      "platform_activity_file_transfer",
      {
        from: { storage: activity, path: "file.md" },
        to: { storage: transcript, folder: "" },
      },
      c,
    );
    expect(io.transfer).toHaveBeenCalled();
    for (const location of [
      { repositoryId: "repo" },
      { storage: repository },
      {},
    ])
      await expect(
        execute(
          "platform_activity_folder_create",
          { ...location, path: "folder" },
          c,
        ),
      ).rejects.toThrow("ACTIVITY_STORAGE_REQUIRED");
    await expect(
      execute(
        "platform_activity_file_transfer",
        {
          from: { storage: activity, path: "file.md" },
          to: { repositoryId: "repo", folder: "" },
        },
        c,
      ),
    ).rejects.toThrow("ACTIVITY_STORAGE_REQUIRED");
  });
});
