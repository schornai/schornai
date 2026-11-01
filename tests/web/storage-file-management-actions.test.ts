import { beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
const state = vi.hoisted(() => ({
  access: vi.fn(),
  create: vi.fn(),
  inspect: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  index: vi.fn(),
  prepare: vi.fn(),
  queue: vi.fn(),
  idle: vi.fn(),
  session: {} as any,
  supabase: {} as any,
  queueProvider: {} as any,
  lock: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => async (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.supabase,
}));
vi.mock("@/lib/storageFileOperations", () => ({
  prepareStorageWrite: state.prepare,
  requireIdleFile: state.idle,
  queueFileProcessing: state.queue,
  withStorageFileOperation: async (
    storage: any,
    path: any,
    supabase: any,
    operation: any,
  ) => {
    await state.access(storage, "write", { supabase });
    return operation({ session: state.session, queue: state.queueProvider });
  },
}));
vi.mock("@schornio/aibox-package-database/storage/createTextFile", () => ({
  createTextFile: state.create,
}));
vi.mock("@schornio/aibox-package-database/storage/inspect", () => ({
  inspect: state.inspect,
}));
vi.mock("@schornio/aibox-package-database/storage/rename", () => ({
  rename: state.rename,
}));
vi.mock("@schornio/aibox-package-database/storage/remove", () => ({
  remove: state.remove,
}));
vi.mock("@schornio/aibox-package-database/storage/fileIndex", () => ({
  removeFileIndex: state.index,
}));
vi.mock("@schornio/aibox-package-database/storage/withStorageFileLock", () => ({
  withStorageFileLock: async (...args: any[]) => {
    state.lock();
    return args[4](args[3]);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { storageCreateTextFile } from "../../apps/web/app/_actions/storageCreateTextFile";
import { storageFileAction } from "../../apps/web/app/_actions/storageFileAction";
const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
const file = {
  file: true,
  name: "file.txt",
  path: "file.txt",
  size: 4,
  type: "text/plain",
  createdAtISO: "2026-10-17",
  updatedAtISO: "2026-10-17",
};
beforeEach(() => {
  vi.resetAllMocks();
  state.create.mockResolvedValue(file);
  state.inspect.mockResolvedValue(file);
  state.queue.mockResolvedValue("queued");
  state.session = {
    storage,
    logAction: vi.fn(),
    abortSignal: new AbortController().signal,
  };
  state.queueProvider = { document: new Doc() };
});
it("authorizes before a text file is created or processing begins", async () => {
  state.access.mockRejectedValue(new Error("denied"));
  await expect(
    storageCreateTextFile({
      storage,
      basePath: "",
      name: "file.txt",
      content: "text",
    }),
  ).rejects.toThrow("denied");
  expect(state.create).not.toHaveBeenCalled();
  expect(state.queue).not.toHaveBeenCalled();
});
it("creates an empty file without queueing extraction", async () => {
  expect(
    await storageCreateTextFile({ storage, basePath: "", name: "file.txt" }),
  ).toEqual({ file });
  expect(state.create).toHaveBeenCalledWith(
    { basePath: "", name: "file.txt", content: "" },
    state.session,
  );
  expect(state.queue).not.toHaveBeenCalled();
});
it.each(["delete", "rename", "process"] as const)(
  "guards %s and rejects folder targets",
  async (action) => {
    state.inspect.mockResolvedValue({ folder: true, path: "folder" });
    await expect(
      storageFileAction({
        storage,
        path: "folder",
        action,
        newName: "new.txt",
      }),
    ).rejects.toThrow("FILE_NOT_FOUND");
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.rename).not.toHaveBeenCalled();
    expect(state.queue).not.toHaveBeenCalled();
  },
);
it("does not mutate an actively processed file", async () => {
  state.idle.mockImplementation(() => {
    throw new Error("busy");
  });
  await expect(
    storageFileAction({ storage, path: "file.txt", action: "delete" }),
  ).rejects.toThrow("busy");
  expect(state.index).not.toHaveBeenCalled();
  expect(state.remove).not.toHaveBeenCalled();
});
it("clears only the file index before deleting the original and reports failure", async () => {
  state.remove.mockRejectedValue(new Error("delete failed"));
  await expect(
    storageFileAction({ storage, path: "file.txt", action: "delete" }),
  ).rejects.toThrow("delete failed");
  expect(state.index).toHaveBeenCalledWith(
    "file.txt",
    state.session,
    state.supabase,
  );
  expect(state.remove).toHaveBeenCalledWith("file.txt", state.session);
});
it("returns already-running processing without creating a second job", async () => {
  state.queue.mockResolvedValue("alreadyQueued");
  expect(
    await storageFileAction({ storage, path: "file.txt", action: "process" }),
  ).toEqual({ processing: "alreadyQueued" });
  expect(state.remove).not.toHaveBeenCalled();
});
