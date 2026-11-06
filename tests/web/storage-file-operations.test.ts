import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  synced: vi.fn(),
  dispose: vi.fn(),
  queue: vi.fn(),
  session: vi.fn(),
  sessionDispose: vi.fn(),
  lock: vi.fn(),
  active: vi.fn(),
  createTask: vi.fn(),
  addTask: vi.fn(),
  user: vi.fn(),
  claims: vi.fn(),
  ensureActivity: vi.fn(),
}));
vi.mock(
  "@schornio/aibox-package-database/storage/requireStorageAccess",
  () => ({ requireStorageAccess: mocks.access }),
);
vi.mock("../../apps/web/lib/ensureActivity", () => ({
  ensureActivity: mocks.ensureActivity,
}));
vi.mock("@schornio/aibox-package-database/storage/withStorageFileLock", () => ({
  withStorageFileLock: mocks.lock,
}));
vi.mock(
  "@schornio/aibox-realtime/documents/storage/findActiveFileTask",
  () => ({ findActiveFileTask: mocks.active }),
);
vi.mock(
  "@schornio/aibox-realtime/documents/storage/createStorageProcessingTask",
  () => ({ createStorageProcessingTask: mocks.createTask }),
);
vi.mock("@schornio/aibox-realtime/documents/taskQueue/addTask", () => ({
  addTask: mocks.addTask,
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUser", () => ({
  getCurrentUser: mocks.user,
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: mocks.claims,
}));
vi.mock(
  "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      constructor(options: unknown) {
        mocks.session(options);
      }
      async [Symbol.asyncDispose]() {
        mocks.sessionDispose();
      }
    },
  }),
);
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    constructor(options: unknown) {
      mocks.queue(options);
    }
    waitForSynced = mocks.synced;
    async [Symbol.asyncDispose]() {
      mocks.dispose();
    }
  },
}));
import {
  prepareStorageWrite,
  queueFileProcessing,
  requireIdleFile,
  withStorageFileOperation,
} from "../../apps/web/lib/storageFileOperations";
const repository = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
beforeEach(() => {
  mocks.synced.mockResolvedValue(undefined);
  mocks.user.mockResolvedValue({ id: "user" });
  mocks.claims.mockResolvedValue({ role: "member" });
  mocks.lock.mockImplementation((_storage, _path, _supabase, signal, perform) =>
    perform(signal),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("authorizes storage before opening a privileged realtime connection", async () => {
  mocks.access.mockRejectedValueOnce(new Error("STORAGE_NOT_AUTHORIZED"));
  const operation = vi.fn();
  await expect(
    withStorageFileOperation(
      {
        type: "documentRepository",
        workspaceId: "workspace",
        documentRepositoryId: "repo",
      },
      "file.txt",
      {} as any,
      operation,
    ),
  ).rejects.toThrow("STORAGE_NOT_AUTHORIZED");
  expect(mocks.queue).not.toHaveBeenCalled();
  expect(operation).not.toHaveBeenCalled();
});
it("uses the configured server credential and rejects a missing credential", async () => {
  const storage = {
    type: "documentRepository",
    workspaceId: "workspace",
    documentRepositoryId: "repo",
  } as const;
  const operation = vi.fn();
  vi.stubEnv(
    "REALTIME_SERVER_SECRET",
    "storage-regression-server-secret-at-least-32-characters",
  );
  mocks.synced.mockRejectedValueOnce(new Error("connection reached"));
  await expect(
    withStorageFileOperation(storage, "file.txt", {} as any, operation),
  ).rejects.toThrow("connection reached");
  expect(mocks.queue).toHaveBeenCalledWith(
    expect.objectContaining({
      serverToken:
        "Worker storage-regression-server-secret-at-least-32-characters",
    }),
  );
  mocks.queue.mockClear();
  vi.stubEnv("REALTIME_SERVER_SECRET", "");
  await expect(
    withStorageFileOperation(storage, "file.txt", {} as any, operation),
  ).rejects.toThrow("REALTIME_SERVER_SECRET");
  expect(mocks.queue).not.toHaveBeenCalled();
  expect(operation).not.toHaveBeenCalled();
});
it("ends an unavailable realtime connection before mutating a file and permits a later retry", async () => {
  const controller = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
  mocks.synced.mockImplementation(
    ({ abortSignal }) =>
      new Promise((_, reject) =>
        abortSignal.addEventListener(
          "abort",
          () => reject(abortSignal.reason),
          { once: true },
        ),
      ),
  );
  const operation = vi.fn();
  const storage = {
    type: "documentRepository",
    workspaceId: "workspace",
    documentRepositoryId: "repo",
  } as const;
  const pending = withStorageFileOperation(
    storage,
    "file.txt",
    {} as any,
    operation,
  );
  const rejected = expect(pending).rejects.toThrow("offline timeout");
  await vi.waitFor(() => expect(mocks.synced).toHaveBeenCalledOnce());
  controller.abort(new Error("offline timeout"));
  await rejected;
  expect(operation).not.toHaveBeenCalled();
  expect(mocks.dispose).toHaveBeenCalledOnce();
  mocks.synced.mockRejectedValueOnce(new Error("retry reached connection"));
  await expect(
    withStorageFileOperation(storage, "file.txt", {} as any, operation),
  ).rejects.toThrow("retry reached connection");
  expect(mocks.synced).toHaveBeenCalledTimes(2);
});

it.each([false, true])(
  "runs authorized mutations with lock=%s and disposes both realtime sessions",
  async (lock) => {
    const supabase = { storage: {} } as any;
    const operation = vi.fn().mockResolvedValue("saved");
    await expect(
      withStorageFileOperation(repository, "file.txt", supabase, operation, {
        lock,
      }),
    ).resolves.toBe("saved");
    expect(mocks.access).toHaveBeenCalledWith(repository, "write", {
      supabase,
    });
    expect(mocks.lock).toHaveBeenCalledTimes(lock ? 1 : 0);
    expect(operation).toHaveBeenCalledWith({
      session: expect.any(Object),
      queue: expect.any(Object),
    });
    expect(mocks.sessionDispose).toHaveBeenCalledOnce();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  },
);

it("serializes writes to the same file, releases failed predecessors and permits unrelated files", async () => {
  const gate = Promise.withResolvers<string>();
  const order: string[] = [];
  const first = withStorageFileOperation(
    repository,
    "same.txt",
    {} as any,
    async () => {
      order.push("first");
      return gate.promise;
    },
  );
  const rejected = expect(first).rejects.toThrow("write failed");
  await vi.waitFor(() => expect(order).toEqual(["first"]));
  const second = withStorageFileOperation(
    repository,
    "same.txt",
    {} as any,
    async () => {
      order.push("second");
      return "saved";
    },
  );
  await withStorageFileOperation(
    repository,
    "different.txt",
    {} as any,
    async () => {
      order.push("unrelated");
    },
  );
  expect(order).toEqual(["first", "unrelated"]);
  gate.reject(new Error("write failed"));
  await rejected;
  await expect(second).resolves.toBe("saved");
  expect(order).toEqual(["first", "unrelated", "second"]);
  expect(mocks.sessionDispose).toHaveBeenCalledTimes(3);
  expect(mocks.dispose).toHaveBeenCalledTimes(3);
});

it("blocks a mutation while a file task is active", () => {
  const queue = { document: {} } as any;
  requireIdleFile(queue, repository, "file.txt");
  mocks.active.mockReturnValue({ id: "processing" });
  expect(() => requireIdleFile(queue, repository, "file.txt")).toThrow(
    "FILE_PROCESSING_IN_PROGRESS",
  );
  expect(mocks.active).toHaveBeenLastCalledWith(
    queue.document,
    repository,
    "file.txt",
  );
});

function processing() {
  return {
    target: { path: "file.txt" } as any,
    session: {
      storage: repository,
      abortSignal: new AbortController().signal,
      logAction: vi.fn(),
    } as any,
    queue: {
      document: {},
      waitForSynced: vi.fn().mockResolvedValue(undefined),
    } as any,
    supabase: { auth: {} } as any,
  };
}
it("does not enqueue duplicate or unsupported processing tasks", async () => {
  const { target, ...options } = processing();
  mocks.active.mockReturnValueOnce({ id: "already-active" });
  await expect(queueFileProcessing(target, options)).resolves.toBe(
    "alreadyQueued",
  );
  expect(mocks.user).not.toHaveBeenCalled();
  mocks.createTask.mockResolvedValue(undefined);
  await expect(queueFileProcessing(target, options)).resolves.toBe(
    "unsupported",
  );
  expect(mocks.addTask).not.toHaveBeenCalled();
  expect(options.session.logAction).not.toHaveBeenCalled();
});

it.each([false, true])(
  "queues processing with the caller identity and useSavedContent=%s",
  async (useSavedContent) => {
    const { target, ...options } = processing();
    const task = { id: "task" };
    mocks.createTask.mockResolvedValue(task);
    await expect(
      queueFileProcessing(target, { ...options, useSavedContent }),
    ).resolves.toBe("queued");
    expect(mocks.createTask).toHaveBeenCalledWith(
      {
        useSavedContent,
        path: "file.txt",
        storage: repository,
        userId: "user",
        userClaims: { role: "member" },
      },
      { supabase: options.supabase },
    );
    expect(mocks.addTask).toHaveBeenCalledWith(options.queue.document, task);
    expect(options.queue.waitForSynced).toHaveBeenCalledWith({
      abortSignal: options.session.abortSignal,
    });
    expect(options.session.logAction).toHaveBeenCalledWith({
      state: "processing",
      target,
    });
  },
);

it("does not report processing before the task has synchronized", async () => {
  const { target, ...options } = processing();
  mocks.createTask.mockResolvedValue({ id: "task" });
  options.queue.waitForSynced.mockRejectedValue(new Error("offline"));
  await expect(queueFileProcessing(target, options)).rejects.toThrow("offline");
  expect(options.session.logAction).not.toHaveBeenCalled();
});

it("authorizes repository writes without creating an activity", async () => {
  const supabase = {} as any;
  await prepareStorageWrite(repository, supabase);
  expect(mocks.access).toHaveBeenCalledWith(repository, "write", { supabase });
  expect(mocks.ensureActivity).not.toHaveBeenCalled();
});

it.each([
  {
    storage: { type: "activity", agentId: "agent", activityId: "activity" },
    table: "chatbots",
    id: "agent",
    label: "Chat",
  },
  {
    storage: {
      type: "activity-transcription",
      transcriberId: "transcriber",
      activityId: "activity",
    },
    table: "transcribers",
    id: "transcriber",
    label: "Transkriptionen",
  },
])(
  "authorizes $table before creating a new activity and checking storage access",
  async ({ storage, table, id, label }) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(query), auth: {} } as any;
    await prepareStorageWrite(storage as any, supabase);
    expect(supabase.from).toHaveBeenCalledWith(table);
    expect(query.eq).toHaveBeenCalledWith("id", id);
    expect(mocks.ensureActivity).toHaveBeenCalledWith("user", storage, {
      labelOnInsert: label,
    });
    expect(mocks.access).toHaveBeenCalledWith(storage, "write", { supabase });
  },
);

it.each([
  { data: null, error: null },
  { data: { id: "agent" }, error: { message: "denied" } },
])("rejects missing or inaccessible activity owners", async (result) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  await expect(
    prepareStorageWrite(
      { type: "activity", agentId: "agent", activityId: "activity" } as any,
      { from: () => query } as any,
    ),
  ).rejects.toThrow("STORAGE_NOT_AUTHORIZED");
  expect(mocks.ensureActivity).not.toHaveBeenCalled();
  expect(mocks.access).not.toHaveBeenCalled();
});

it.each(["agent/other", "..", ""])(
  "rejects invalid activity identifiers (%s) before any database access",
  async (agentId) => {
    await expect(
      prepareStorageWrite(
        { type: "activity", agentId, activityId: "activity" } as any,
        {} as any,
      ),
    ).rejects.toThrow("INVALID_STORAGE");
    expect(mocks.ensureActivity).not.toHaveBeenCalled();
  },
);
