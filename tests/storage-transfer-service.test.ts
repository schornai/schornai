import { beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  currentUser: vi.fn(),
  currentClaims: vi.fn(),
  transfer: vi.fn(),
  index: vi.fn(),
  content: vi.fn(),
  routing: vi.fn(),
  lock: vi.fn(),
  log: vi.fn(),
  queue: undefined as any,
}));
vi.mock("@schornio/aibox-database/storage/requireStorageAccess", () => ({
  requireStorageAccess: mocks.access,
}));
vi.mock("@schornio/aibox-database/storage/transferFile", () => ({
  transferFile: mocks.transfer,
}));
vi.mock("@schornio/aibox-database/storage/fileIndex", () => ({
  removeFileIndex: mocks.index,
}));
vi.mock("@schornio/aibox-database/storage/getDocumentContent", () => ({
  getDocumentContent: mocks.content,
}));
vi.mock("@schornio/aibox-database/user/getCurrentUser", () => ({
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@schornio/aibox-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: mocks.currentClaims,
}));
vi.mock("@schornio/aibox-database/storage/withStorageFileLock", () => ({
  withStorageFileLock: async (
    storage: any,
    path: string,
    _client: any,
    signal: AbortSignal,
    operation: any,
  ) => {
    mocks.lock(storage, path);
    return operation(signal);
  },
}));
vi.mock(
  "../packages/realtime/src/documents/storage/createStorageProcessingTask",
  () => ({ createStorageProcessingTask: mocks.routing }),
);
vi.mock("../packages/realtime/src/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = mocks.queue;
    async waitForSynced() {}
    async [Symbol.asyncDispose]() {}
  },
}));
vi.mock(
  "../packages/realtime/src/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      storage: any;
      constructor(options: any) {
        this.storage = options.storage;
      }
      logAction = mocks.log;
      async [Symbol.asyncDispose]() {}
    },
  }),
);
import { transferStorageFile } from "../packages/realtime/src/documents/storage/transferStorageFile";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
const source = {
  type: "documentRepository",
  workspaceId: "source-workspace",
  documentRepositoryId: "source-repo",
} as const;
const target = {
  type: "documentRepository",
  workspaceId: "target-workspace",
  documentRepositoryId: "target-repo",
} as const;
const input = {
  from: { storage: source, path: "voice.wav" },
  to: { storage: target, folder: "folder" },
  move: false,
};
const file = { file: true, name: "voice.wav", path: "folder/voice.wav" };
const options = {
  supabase: {} as any,
  websocketProvider: {} as any,
  serverToken: "Worker test" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.queue = new Doc();
  mocks.currentUser.mockResolvedValue({ id: "user" });
  mocks.currentClaims.mockResolvedValue([]);
  mocks.transfer.mockImplementation(async (_from, _to, config) => {
    await config.beforeRemove?.(file);
    return file;
  });
  mocks.content.mockResolvedValue({
    type: "transcript",
    segments: [{ segmentOverride: "Corrected", words: [] }],
  });
});
it("copies from a read-only source across workspaces and reindexes preserved transcripts without retranscribing", async () => {
  mocks.access.mockImplementation(async (storage, mode) => {
    if (storage === source && mode === "write") throw new Error("denied");
  });
  expect(await transferStorageFile(input, options)).toMatchObject({
    processing: "queued",
  });
  expect(mocks.access.mock.calls).toEqual([
    [source, "read", { supabase: options.supabase }],
    [target, "write", { supabase: options.supabase }],
  ]);
  expect(mocks.lock.mock.calls).toEqual([[target, "folder/voice.wav"]]);
  expect(mocks.index).not.toHaveBeenCalled();
  expect(mocks.routing).not.toHaveBeenCalled();
  expect(mocks.queue.getArray("tasks").toArray()).toMatchObject([
    {
      type: "process-file",
      parameters: { reuseContent: true, storage: target },
    },
  ]);
  await expect(
    transferStorageFile({ ...input, move: true }, options),
  ).rejects.toThrow("denied");
  expect(mocks.transfer).toHaveBeenCalledOnce();
});
it("rejects an unwritable destination before copying", async () => {
  mocks.access.mockImplementation(async (storage) => {
    if (storage === target) throw new Error("denied");
  });
  await expect(transferStorageFile(input, options)).rejects.toThrow("denied");
  expect(mocks.transfer).not.toHaveBeenCalled();
});
it("locks both locations when moving and removes only the source index after copies succeed", async () => {
  await transferStorageFile({ ...input, move: true }, options);
  expect(mocks.lock.mock.calls).toEqual([
    [source, "voice.wav"],
    [target, "folder/voice.wav"],
  ]);
  expect(mocks.index).toHaveBeenCalledWith(
    "voice.wav",
    expect.objectContaining({ storage: source }),
    options.supabase,
  );
});
it("does not queue processing when copying fails and preserves the explicit partial-failure code", async () => {
  mocks.transfer.mockRejectedValueOnce(
    new Error("COPIED_SOURCE_DELETE_FAILED"),
  );
  await expect(
    transferStorageFile({ ...input, move: true }, options),
  ).rejects.toThrow("COPIED_SOURCE_DELETE_FAILED");
  expect(mocks.queue.getArray("tasks").length).toBe(0);
});
it("reports processing failure separately after the destination has been safely created", async () => {
  mocks.content.mockRejectedValueOnce(new Error("read failed"));
  expect(await transferStorageFile(input, options)).toMatchObject({
    file,
    processing: "error",
  });
  expect(mocks.transfer).toHaveBeenCalledOnce();
});
it("does not mutate files that have an active queued task", async () => {
  addTask(mocks.queue, {
    id: "task",
    type: "process-file",
    state: "pending",
    requiredCapabilities: [],
    parameters: {
      storage: source,
      path: "voice.wav",
      userId: "user",
      userClaims: [],
    },
  });
  await expect(transferStorageFile(input, options)).rejects.toThrow(
    "FILE_PROCESSING_IN_PROGRESS",
  );
  expect(mocks.transfer).not.toHaveBeenCalled();
});
it("rejects identical physical paths and changed file extensions", async () => {
  await expect(
    transferStorageFile(
      { ...input, to: { storage: source, folder: "" } },
      options,
    ),
  ).rejects.toThrow("SOURCE_EQUALS_TARGET");
  await expect(
    transferStorageFile(
      { ...input, to: { ...input.to, name: "voice.txt" } },
      options,
    ),
  ).rejects.toThrow("FILE_EXTENSION_CHANGE_NOT_ALLOWED");
  expect(mocks.transfer).not.toHaveBeenCalled();
});

it.each([false, true])(
  "uses the worker JWT identity for authorization and indexing (move=%s)",
  async (move) => {
    mocks.currentUser.mockRejectedValue(new Error("No browser session"));
    mocks.currentClaims.mockRejectedValue(new Error("No browser session"));
    const authenticatedUser = {
      userId: "worker-user",
      userClaims: "admin" as const,
    };
    expect(
      await transferStorageFile(
        { ...input, move },
        { ...options, authenticatedUser },
      ),
    ).toMatchObject({ processing: "queued" });
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.currentClaims).not.toHaveBeenCalled();
    expect(mocks.access).toHaveBeenCalledWith(target, "write", {
      supabase: options.supabase,
      authenticatedClaims: "admin",
    });
    expect(mocks.queue.getArray("tasks").toArray()).toMatchObject([
      {
        parameters: {
          userId: "worker-user",
          userClaims: "admin",
          reuseContent: true,
        },
      },
    ]);
  },
);
