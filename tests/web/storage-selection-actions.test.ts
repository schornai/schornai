import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  access: vi.fn(),
  prepare: vi.fn(),
  agent: vi.fn(),
  repositories: vi.fn(),
  claims: vi.fn(),
  workspaces: vi.fn(),
  list: vi.fn(),
  inspect: vi.fn(),
  content: vi.fn(),
  transfer: vi.fn(),
  supabase: { auth: {}, storage: { from: vi.fn(() => ({})) } },
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.supabase,
}));
vi.mock("@/lib/storageFileOperations", () => ({
  prepareStorageWrite: state.prepare,
}));
vi.mock("@schornio/aibox-package-database/agent/getAgentById", () => ({
  getAgentById: state.agent,
}));
vi.mock(
  "@schornio/aibox-package-database/documentRepositories/getDocumentRepositories",
  () => ({ getDocumentRepositories: state.repositories }),
);
vi.mock("@schornio/aibox-package-database/workspace/getWorkspaces", () => ({
  getWorkspaces: state.workspaces,
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: state.claims,
}));
vi.mock(
  "@schornio/aibox-package-database/storage/requireStorageAccess",
  () => ({ requireStorageAccess: state.access }),
);
vi.mock("@schornio/aibox-package-database/storage/list", () => ({
  list: state.list,
}));
vi.mock("@schornio/aibox-package-database/storage/inspect", () => ({
  inspect: state.inspect,
}));
vi.mock("@schornio/aibox-package-database/storage/getDocumentContent", () => ({
  getDocumentContent: state.content,
}));
vi.mock(
  "@schornio/aibox-realtime/documents/storage/transferStorageFile",
  () => ({ transferStorageFile: state.transfer }),
);
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { storageBrowse } from "../../apps/web/app/_actions/storageBrowse";
import { storageSelectChatFile } from "../../apps/web/app/_actions/storageSelectChatFile";
const storage = {
  type: "documentRepository",
  workspaceId: "w",
  documentRepositoryId: "r",
} as const;
const file = {
  file: true,
  name: "file.txt",
  path: "file.txt",
  type: "text/plain",
  size: 3,
  createdAtISO: "2026-10-17",
  updatedAtISO: "2026-10-17",
};
const input = {
  agentId: "a",
  activityId: "activity",
  storage,
  path: "file.txt",
};
beforeEach(() => {
  vi.clearAllMocks();
  state.access.mockReset();
  state.prepare.mockReset();
  state.repositories.mockResolvedValue([
    { id: "r", identifier: "repo", workspaceId: "w", name: "Read only" },
    {
      id: "writable",
      identifier: "other",
      workspaceId: "other",
      name: "Writable",
    },
  ]);
  state.claims.mockResolvedValue([
    { organization_id: "w", role: "user" },
    { organization_id: "other", role: "editor" },
  ]);
  state.workspaces.mockResolvedValue([
    { id: "w", name: "Source team" },
    { id: "other", name: "Target team" },
  ]);
  state.list.mockResolvedValue([file]);
  state.inspect.mockResolvedValue(file);
  state.content.mockResolvedValue({ type: "mdc", current: "text" });
  state.agent.mockResolvedValue({ roles: [] });
  state.transfer.mockImplementation(async ({ to }) => ({
    file: { ...file, path: to.name, name: to.name },
    storage: to.storage,
    processing: "ready",
  }));
});
it("lists readable sources but only writable destinations and labels their workspaces", async () => {
  const sources = await storageBrowse({ path: "", mode: "read" });
  expect(sources.repositories).toHaveLength(2);
  const targets = await storageBrowse({ path: "", mode: "write" });
  expect(targets.repositories).toEqual([
    {
      id: "writable",
      workspaceId: "other",
      name: "Writable",
      workspaceName: "Target team",
    },
  ]);
  state.claims.mockResolvedValue("admin");
  expect(
    (await storageBrowse({ path: "", mode: "write" })).repositories,
  ).toHaveLength(2);
});
it("checks actual storage access before listing and rejects traversal", async () => {
  state.access.mockRejectedValueOnce(new Error("denied"));
  await expect(
    storageBrowse({ storage, path: "", mode: "write" }),
  ).rejects.toThrow("denied");
  expect(state.list).not.toHaveBeenCalled();
  await expect(
    storageBrowse({ storage, path: "../outside", mode: "read" }),
  ).rejects.toThrow();
  expect(state.list).not.toHaveBeenCalled();
});
it("checks conversation ownership and source access before exposing or copying a file", async () => {
  state.prepare.mockRejectedValueOnce(new Error("wrong chat"));
  await expect(storageSelectChatFile(input)).rejects.toThrow("wrong chat");
  state.access.mockRejectedValueOnce(new Error("denied source"));
  await expect(storageSelectChatFile(input)).rejects.toThrow("denied source");
  expect(state.inspect).not.toHaveBeenCalled();
  expect(state.transfer).not.toHaveBeenCalled();
});
it("copies an unmounted file to a unique conversation path without changing the source", async () => {
  const result = await storageSelectChatFile(input);
  expect(result.copied).toBe(true);
  expect(result.file?.path).toMatch(/^attachment-[\da-f-]+-file.txt$/);
  expect(state.transfer).toHaveBeenCalledWith(
    expect.objectContaining({
      move: false,
      from: { storage, path: "file.txt" },
      to: {
        storage: { type: "activity", agentId: "a", activityId: "activity" },
        folder: "",
        name: result.file?.path,
      },
    }),
    expect.any(Object),
  );
});
it("reuses current conversation files without copying and requires processed document content", async () => {
  const result = await storageSelectChatFile({
    ...input,
    storage: { type: "activity", agentId: "a", activityId: "activity" },
  });
  expect(result).toEqual({ file, copied: false });
  expect(state.transfer).not.toHaveBeenCalled();
  state.inspect.mockResolvedValue({
    ...file,
    name: "file.pdf",
    path: "file.pdf",
    type: "application/pdf",
  });
  state.content.mockResolvedValue(undefined);
  expect(await storageSelectChatFile({ ...input, path: "file.pdf" })).toEqual({
    error: "FILE_NOT_PROCESSED",
  });
  expect(state.transfer).not.toHaveBeenCalled();
});
it("references an accessible common mount using the agent path instead of making a copy", async () => {
  state.agent.mockResolvedValue({
    roles: [
      {
        documentRepositoryMounts: [
          {
            id: "mount",
            documentRepositoryIdentifier: "repo",
            mount: "knowledge",
            pathRepository: "",
            permission: "read-only",
          },
        ],
      },
    ],
  });
  const result = await storageSelectChatFile(input);
  expect(result).toEqual({
    file: { ...file, attachment: { storage, agentPath: "knowledge/file.txt" } },
    copied: false,
  });
  expect(state.access).toHaveBeenCalledWith(storage, "read", {
    supabase: state.supabase,
  });
  expect(state.transfer).not.toHaveBeenCalled();
});
