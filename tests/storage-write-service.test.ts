import { beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  inspect: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  user: vi.fn(),
  claims: vi.fn(),
  lock: vi.fn(),
  synced: vi.fn(),
  log: vi.fn(),
  dispose: vi.fn(),
  queue: undefined as any,
}));
vi.mock("@schornio/aibox-database/storage/requireStorageAccess", () => ({
  requireStorageAccess: mocks.access,
}));
vi.mock("@schornio/aibox-database/storage/inspect", () => ({
  inspect: mocks.inspect,
}));
vi.mock("@schornio/aibox-database/storage/updateFileText", () => ({
  updateFileText: mocks.update,
}));
vi.mock("@schornio/aibox-database/storage/createFile", () => ({
  createFile: mocks.create,
}));
vi.mock("@schornio/aibox-database/user/getCurrentUser", () => ({
  getCurrentUser: mocks.user,
}));
vi.mock("@schornio/aibox-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: mocks.claims,
}));
vi.mock("@schornio/aibox-database/storage/withStorageFileLock", () => ({
  withStorageFileLock: mocks.lock,
}));
vi.mock("../packages/realtime/src/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = mocks.queue;
    waitForSynced = mocks.synced;
    [Symbol.asyncDispose] = mocks.dispose;
  },
}));
vi.mock(
  "../packages/realtime/src/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      storage: any;
      abortSignal: AbortSignal;
      constructor(options: any) {
        this.storage = options.storage;
        this.abortSignal = options.abortSignal;
      }
      logAction = mocks.log;
      [Symbol.asyncDispose] = mocks.dispose;
    },
  }),
);
import { writeStorageFileText } from "../packages/realtime/src/documents/storage/writeStorageFileText";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
const file = {
  file: true,
  name: "notes.txt",
  path: "notes.txt",
  type: "text/plain",
};
const input = {
  storage,
  path: file.path,
  text: "after",
  expectedText: "before",
};
const options = {
  supabase: { storage: {} } as any,
  websocketProvider: {} as any,
  serverToken: "Worker test" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.queue = new Doc();
  mocks.inspect.mockResolvedValue(file);
  mocks.update.mockResolvedValue({ status: "saved", file });
  mocks.create.mockResolvedValue(file);
  mocks.user.mockResolvedValue({ id: "user" });
  mocks.claims.mockResolvedValue([]);
  mocks.lock.mockImplementation(
    async (_storage, _path, _supabase, signal, operation) => operation(signal),
  );
});
it("authorizes, locks, writes under the lease and releases it before a worker can claim indexing", async () => {
  let held = false;
  mocks.lock.mockImplementation(
    async (_storage, _path, _supabase, signal, operation) => {
      held = true;
      try {
        return await operation(signal);
      } finally {
        held = false;
      }
    },
  );
  mocks.update.mockImplementation(async () => {
    expect(held).toBe(true);
    expect(mocks.dispose).not.toHaveBeenCalled();
    return { status: "saved", file };
  });
  mocks.synced
    .mockImplementationOnce(async () => {})
    .mockImplementationOnce(async () => {
      expect(held).toBe(false);
    });
  expect(await writeStorageFileText(input, options)).toMatchObject({
    status: "saved",
    indexQueued: true,
  });
  expect(mocks.access).toHaveBeenCalledWith(storage, "write", {
    supabase: options.supabase,
  });
  expect(mocks.access.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.lock.mock.invocationCallOrder[0]!,
  );
  expect(mocks.update).toHaveBeenCalledWith(
    { path: "notes.txt", text: "after", expectedText: "before" },
    expect.anything(),
  );
  expect(mocks.queue.getArray("tasks").toArray()).toMatchObject([
    {
      type: "process-file",
      parameters: {
        storage,
        path: "notes.txt",
        useSavedContent: true,
        userId: "user",
        userClaims: [],
      },
    },
  ]);
  expect(mocks.dispose).toHaveBeenCalledTimes(3);
});
it("uses the trusted worker identity and allows deliberate overwrites", async () => {
  const authenticatedUser = {
    userId: "worker-user",
    userClaims: "admin" as const,
  };
  expect(
    await writeStorageFileText(
      { ...input, expectedText: undefined },
      { ...options, authenticatedUser },
    ),
  ).toMatchObject({ indexQueued: true });
  expect(mocks.access).toHaveBeenCalledWith(storage, "write", {
    supabase: options.supabase,
    authenticatedClaims: "admin",
  });
  expect(mocks.user).not.toHaveBeenCalled();
  expect(mocks.claims).not.toHaveBeenCalled();
  expect(mocks.queue.getArray("tasks").toArray()).toMatchObject([
    { parameters: authenticatedUser },
  ]);
});
it("creates a missing text file once and indexes the original without extraction", async () => {
  mocks.inspect.mockResolvedValue(undefined);
  expect(
    await writeStorageFileText(
      { ...input, expectedText: undefined, createIfMissing: true },
      options,
    ),
  ).toMatchObject({ status: "saved", indexQueued: true });
  expect(mocks.create).toHaveBeenCalledWith(
    expect.any(Blob),
    "notes.txt",
    expect.anything(),
    { upsert: false },
  );
  expect(await mocks.create.mock.calls[0][0].text()).toBe("after");
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.queue.getArray("tasks").toArray()).toMatchObject([
    { parameters: { useSavedContent: true } },
  ]);
});
it("distinguishes absent files from inspection errors and rejects unsupported new files", async () => {
  mocks.inspect.mockRejectedValueOnce(new Error("storage unavailable"));
  await expect(
    writeStorageFileText({ ...input, createIfMissing: true }, options),
  ).rejects.toThrow("storage unavailable");
  mocks.inspect.mockResolvedValue(undefined);
  await expect(writeStorageFileText(input, options)).rejects.toThrow(
    "FILE_NOT_FOUND",
  );
  await expect(
    writeStorageFileText(
      { ...input, path: "pretend.pdf", createIfMissing: true },
      options,
    ),
  ).rejects.toThrow("UNSUPPORTED_NEW_TEXT_FILE");
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.queue.getArray("tasks").length).toBe(0);
});
it("rejects folders and files occupying a parent directory", async () => {
  mocks.inspect.mockResolvedValue({ folder: true });
  await expect(writeStorageFileText(input, options)).rejects.toThrow(
    "TARGET_IS_FOLDER",
  );
  mocks.inspect.mockResolvedValueOnce(undefined).mockResolvedValue(file);
  await expect(
    writeStorageFileText(
      { ...input, path: "parent/notes.txt", createIfMissing: true },
      options,
    ),
  ).rejects.toThrow("TARGET_FOLDER_IS_FILE");
  expect(mocks.create).not.toHaveBeenCalled();
});
it("rejects forbidden or busy writes before reading file content", async () => {
  mocks.access.mockRejectedValueOnce(new Error("denied"));
  await expect(writeStorageFileText(input, options)).rejects.toThrow("denied");
  addTask(mocks.queue, {
    id: "busy",
    state: "pending",
    type: "process-file",
    requiredCapabilities: [],
    parameters: { storage, path: "notes.txt", userId: "user", userClaims: [] },
  });
  await expect(writeStorageFileText(input, options)).rejects.toThrow(
    "FILE_PROCESSING_IN_PROGRESS",
  );
  expect(mocks.inspect).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it.each(["conflict", "recoveryRequired"])(
  "does not queue an unsaved %s result",
  async (status) => {
    mocks.update.mockResolvedValue({ status });
    expect(await writeStorageFileText(input, options)).toEqual({ status });
    expect(mocks.queue.getArray("tasks").length).toBe(0);
  },
);
it("preserves storage errors and does not queue an unsuccessful save", async () => {
  mocks.update.mockRejectedValue(new Error("SAVE_FAILED"));
  await expect(writeStorageFileText(input, options)).rejects.toThrow(
    "SAVE_FAILED",
  );
  expect(mocks.queue.getArray("tasks").length).toBe(0);
  expect(mocks.dispose).toHaveBeenCalledTimes(2);
});
it("reports a queue synchronization failure separately from saved content", async () => {
  mocks.synced
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("offline"));
  expect(await writeStorageFileText(input, options)).toMatchObject({
    status: "saved",
    indexQueued: false,
  });
});
it("does not index conversation files", async () => {
  expect(
    await writeStorageFileText(
      {
        ...input,
        storage: { type: "activity", agentId: "agent", activityId: "activity" },
      },
      options,
    ),
  ).toMatchObject({ status: "saved", indexQueued: true });
  expect(mocks.queue.getArray("tasks").length).toBe(0);
  expect(mocks.user).not.toHaveBeenCalled();
});
