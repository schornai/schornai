import { beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { processXRAGImportFiles } from "../packages/realtime/src/platform/processXRAGImportFiles.ts";
const state = vi.hoisted(() => ({
  claims: vi.fn(async () => [] as any[]),
  read: vi.fn(),
  options: vi.fn(),
  sync: vi.fn(),
  dispose: vi.fn(),
  create: vi.fn(),
  document: undefined as any,
}));
vi.mock("@schornio/aibox-database/task/getTaskClaims", () => ({
  getTaskClaims: state.claims,
}));
vi.mock("@schornio/aibox-database/xrag/importTransaction", () => ({
  readImport: state.read,
}));
vi.mock("@schornio/aibox-database/xrag/getExportWorkerOptions", () => ({
  getExportWorkerOptions: state.options,
}));
vi.mock("../packages/realtime/src/server/ServerRealtimeProvider.ts", () => ({
  ServerRealtimeProvider: class {
    document = state.document;
    waitForSynced = state.sync;
    [Symbol.asyncDispose] = state.dispose;
  },
}));
vi.mock(
  "../packages/realtime/src/documents/storage/createStorageProcessingTask.ts",
  () => ({ createStorageProcessingTask: state.create }),
);
const options = {
  supabase: {} as any,
  serverToken: "Worker token" as const,
  signal: new AbortController().signal,
};
beforeEach(() => {
  vi.clearAllMocks();
  state.document = new Doc();
  state.options.mockResolvedValue({
    supabase: options.supabase,
    authenticated: { claims: "admin" },
  });
  state.read.mockResolvedValue({
    user_id: "user",
    state: "committed",
    plan: {
      claims: "admin",
      processing: [
        { id: "first", path: "a.txt", useSavedContent: false, storage: {} },
        { id: "second", path: "b.txt", useSavedContent: true, storage: {} },
      ],
    },
  });
  state.create.mockImplementation(async (parameters) => ({
    id: "random",
    type: "process-file",
    state: "pending",
    parameters,
    requiredCapabilities: [],
  }));
});
it("delivers committed imports using current owner permissions and stable task IDs", async () => {
  await processXRAGImportFiles("import", options);
  await processXRAGImportFiles("import", options);
  expect(
    state.document
      .getArray("tasks")
      .toArray()
      .map((t: any) => t.id),
  ).toEqual(["first", "second"]);
  expect(state.create).toHaveBeenCalledTimes(2);
  expect(state.create).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user",
      userClaims: "admin",
      useSavedContent: true,
    }),
    { supabase: options.supabase },
  );
});
it("never dispatches an uncommitted or rolled back import", async () => {
  state.read.mockResolvedValueOnce({ state: "rolled_back" });
  await expect(processXRAGImportFiles("import", options)).rejects.toThrow(
    "NOT_COMMITTED",
  );
  expect(state.create).not.toHaveBeenCalled();
});
it("can retry failed delivery and always disposes its connection", async () => {
  state.create.mockRejectedValueOnce(new Error("offline"));
  await expect(processXRAGImportFiles("import", options)).rejects.toThrow(
    "offline",
  );
  expect(state.dispose).toHaveBeenCalledOnce();
  await processXRAGImportFiles("import", options);
  expect(state.document.getArray("tasks")).toHaveLength(2);
});
it("skips unsupported files and honors cancellation", async () => {
  state.create.mockResolvedValue(undefined);
  await processXRAGImportFiles("import", options);
  expect(state.document.getArray("tasks")).toHaveLength(0);
  await expect(
    processXRAGImportFiles("import", {
      ...options,
      signal: AbortSignal.abort(new Error("cancelled")),
    }),
  ).rejects.toThrow("cancelled");
});

it("does not republish a completed task after its Yjs history was pruned", async () => {
  state.claims.mockResolvedValueOnce([
    { task_id: "first" },
    { task_id: "second" },
  ]);
  await processXRAGImportFiles("import", options);
  expect(state.create).not.toHaveBeenCalled();
});
