import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeStorageMutation } from "../../apps/web/lib/authorizeStorageMutation";
import { storageCreateFolders } from "../../apps/web/app/_actions/storageCreateFolders";
import { storageRemove } from "../../apps/web/app/_actions/storageRemove";
vi.mock("@/lib/authorizeStorageMutation", () => ({
  authorizeStorageMutation: vi.fn(async () => ({
    user: { id: "user" },
    userClaims: [],
  })),
}));
const mocks = vi.hoisted(() => ({
  ensure: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  dispose: vi.fn(),
  redirect: vi.fn(),
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
  createSupabaseServerClient: async () => ({ auth: {}, storage: {} }),
}));
vi.mock("@/lib/ensureActivity", () => ({ ensureActivity: mocks.ensure }));
vi.mock("@schornio/aibox-package-database/user/getCurrentUser", () => ({
  getCurrentUser: async () => ({ id: "user" }),
}));
vi.mock("@schornio/aibox-package-database/storage/createFolder", () => ({
  createFolder: mocks.create,
}));
vi.mock("@schornio/aibox-package-database/storage/remove", () => ({
  remove: mocks.remove,
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock(
  "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      constructor(public options: any) {}
      [Symbol.asyncDispose]() {
        mocks.dispose();
        return Promise.resolve();
      }
    },
  }),
);
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
beforeEach(() => {
  for (const mock of Object.values(mocks))
    mock.mockReset().mockResolvedValue(undefined);
});
const storages = [
  { type: "activity", agentId: "agent", activityId: "activity" },
  {
    type: "activity-transcription",
    transcriberId: "transcriber",
    activityId: "activity",
  },
  {
    type: "documentRepository",
    documentRepositoryId: "repo",
    workspaceId: "workspace",
  },
];
describe("storage mutation server actions", () => {
  it.each(storages)(
    "creates every folder and initializes activity storage %j",
    async (storage) => {
      await storageCreateFolders({
        storage,
        basePath: "/base",
        folderNames: ["one", "two"],
      } as any);
      expect(mocks.create.mock.calls.map((call) => call[0])).toEqual([
        "/base/one",
        "/base/two",
      ]);
      expect(mocks.ensure).toHaveBeenCalledTimes(
        storage.type === "documentRepository" ? 0 : 1,
      );
      expect(mocks.dispose).toHaveBeenCalledOnce();
    },
  );
  it.each([undefined, { basePathApp: "/files" }])(
    "deletes paths and optionally redirects to their parent %j",
    async (redirectToParent) => {
      await storageRemove({
        storage: storages[0],
        path: "folder/file.txt",
        redirectToParent,
      } as any);
      expect(mocks.remove).toHaveBeenCalledWith(
        "folder/file.txt",
        expect.any(Object),
      );
      expect(mocks.dispose).toHaveBeenCalledOnce();
      if (redirectToParent)
        expect(mocks.redirect).toHaveBeenCalledWith("/files/folder");
      else expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );
  it("disposes failed operations and does not navigate after a failed deletion", async () => {
    mocks.remove.mockRejectedValueOnce(new Error("denied"));
    await expect(
      storageRemove({
        storage: storages[0],
        path: "file.txt",
        redirectToParent: { basePathApp: "/files" },
      } as any),
    ).rejects.toThrow("denied");
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

it("rejects unauthorized storage mutations before opening privileged sessions", async () => {
  vi.mocked(authorizeStorageMutation).mockRejectedValueOnce(
    new Error("NOT_AUTHORIZED"),
  );
  await expect(
    storageRemove({ storage: storages[0], path: "private.txt" } as any),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.dispose).not.toHaveBeenCalled();
});
