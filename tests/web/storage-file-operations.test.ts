import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  synced: vi.fn(),
  dispose: vi.fn(),
  queue: vi.fn(),
}));
vi.mock(
  "@schornio/aibox-package-database/storage/requireStorageAccess",
  () => ({ requireStorageAccess: mocks.access }),
);
vi.mock("../../apps/web/lib/ensureActivity", () => ({
  ensureActivity: vi.fn(),
}));
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
import { withStorageFileOperation } from "../../apps/web/lib/storageFileOperations";
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
