import { describe, expect, it, vi } from "vitest";
import { StorageSession } from "../packages/database/src/storage/_utils/StorageSession";
import { createTextFile } from "../packages/database/src/storage/createTextFile";
import { transferFile } from "../packages/database/src/storage/transferFile";
import { rename } from "../packages/database/src/storage/rename";
import { requireStorageAccess } from "../packages/database/src/storage/requireStorageAccess";
import {
  validateFileName,
  validateStoragePath,
} from "../packages/database/src/storage/validatePath";
import {
  MDC_FILE_EXTENSION as MDC,
  TRANSCRIPT_FILE_EXTENSION as TRANSCRIPT,
} from "../packages/database/src/storage/_utils/toStorageObjectArray";
import { query } from "./helpers/supabase";
import { Doc } from "yjs";
import { findActiveFileTask } from "../packages/realtime/src/documents/storage/findActiveFileTask";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";

const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
function fixture(initial: Record<string, string> = {}) {
  const objects = new Map(
    Object.entries(initial).map(([path, text]) => [path, new Blob([text])]),
  );
  const api = {
    list: vi.fn(async (path: string, { search }: any) => {
      path = path.replace(/\/$/, "");
      const entries = new Map<string, any>();
      for (const [key, blob] of objects) {
        if (!key.startsWith(path + "/")) continue;
        const relative = key.slice(path.length + 1);
        const name = relative.split("/")[0]!;
        if (search && !name.includes(search)) continue;
        entries.set(name, {
          name,
          metadata: relative.includes("/")
            ? null
            : {
                size: blob.size,
                mimetype: "text/plain",
                eTag: await blob.text(),
              },
          created_at: 0,
          updated_at: 0,
        });
      }
      return { data: [...entries.values()], error: null };
    }),
    upload: vi.fn(async (path: string, blob: Blob, options: any) => {
      if (objects.has(path) && !options?.upsert)
        return { error: new Error("collision") };
      objects.set(path, blob);
      return { error: null };
    }),
    copy: vi.fn(async (from: string, to: string) => {
      if (!objects.has(from) || objects.has(to))
        return { error: new Error("collision or missing") };
      objects.set(to, objects.get(from)!);
      return { error: null };
    }),
    remove: vi.fn(async (paths: string[]) => {
      for (const path of paths) objects.delete(path);
      return { error: null };
    }),
  };
  const session = Object.assign(
    new StorageSession({
      storage,
      supabaseStorage: { from: () => api } as any,
    }),
    { logAction: vi.fn() },
  );
  return { api, objects, session };
}
describe("text file creation", () => {
  it("stores Unicode text in UTF-8 without overwriting", async () => {
    const { session, objects, api } = fixture();
    const text = "Grüße 👋 日本語";
    const target = await createTextFile(
      { basePath: "", name: "Notizen.txt", content: text },
      session,
    );
    expect(await objects.get("workspace/repo/Notizen.txt")!.text()).toBe(text);
    expect(target.size).toBe(new TextEncoder().encode(text).byteLength);
    expect(api.upload.mock.calls[0][2]).toEqual({ upsert: false });
    await expect(
      createTextFile(
        { basePath: "", name: "Notizen.txt", content: "replacement" },
        session,
      ),
    ).rejects.toThrow("FILE_ALREADY_EXISTS");
    expect(await objects.get("workspace/repo/Notizen.txt")!.text()).toBe(text);
  });
  it("supports empty files and Markdown", async () => {
    const { session, objects } = fixture();
    await createTextFile(
      { basePath: "", name: "blank.md", content: "" },
      session,
    );
    expect(objects.get("workspace/repo/blank.md")!.size).toBe(0);
  });
  it.each([
    "",
    " ",
    "../file.txt",
    "a/b.txt",
    "a\\b.txt",
    "file?.txt",
    "a.__xrag_content.mdc",
    ".",
    "..",
  ])("rejects unsafe name %s", (name) =>
    expect(() => validateFileName(name)).toThrow(),
  );
  it("accepts arbitrary extensions but rejects missing folders and overlong content", async () => {
    const { session, api } = fixture();
    await expect(
      createTextFile({ basePath: "", name: "a.exe", content: "" }, session),
    ).resolves.toMatchObject({ name: "a.exe" });
    api.upload.mockClear();
    await expect(
      createTextFile(
        { basePath: "missing", name: "a.txt", content: "" },
        session,
      ),
    ).rejects.toThrow("FOLDER");
    await expect(
      createTextFile(
        { basePath: "", name: "a.txt", content: "ä".repeat(600000) },
        session,
      ),
    ).rejects.toThrow("TOO_LARGE");
    expect(api.upload).not.toHaveBeenCalled();
    expect(() => validateStoragePath("safe/../../escape.txt")).toThrow();
    for (const path of [
      "safe/．．/escape.txt",
      "safe／．．／escape.txt",
      "safe/.?./escape.txt",
    ])
      expect(() => validateStoragePath(path)).toThrow("INVALID_FILE_PATH");
  });
});
describe("safe file transfers and renaming", () => {
  const initial = {
    "workspace/repo/old.txt": "original",
    ["workspace/repo/old.txt" + MDC]: "edited",
    ["workspace/repo/old.txt" + TRANSCRIPT]: "transcript",
  };
  it("renames original and both sidecars with a scoped index update", async () => {
    const { session, objects } = fixture(initial);
    const q = query();
    const supabase = { from: vi.fn(() => q) } as any;
    await rename(
      { path: "old.txt", storageSession: session, supabase },
      "new.txt",
    );
    for (const suffix of ["", MDC, TRANSCRIPT]) {
      expect(objects.has("workspace/repo/old.txt" + suffix)).toBe(false);
      expect(objects.has("workspace/repo/new.txt" + suffix)).toBe(true);
    }
    expect(q.eq).toHaveBeenCalledWith("database_id", "repo");
    expect(q.eq).toHaveBeenCalledWith(
      "url",
      "database_files/workspace/repo/old.txt",
    );
    expect(q.update).toHaveBeenCalledWith({
      name: "new.txt",
      url: "database_files/workspace/repo/new.txt",
    });
  });
  it.each(["new.txt", "new.txt" + MDC, "new.txt" + TRANSCRIPT])(
    "refuses a target collision at %s",
    async (name) => {
      const { session, api } = fixture({
        ...initial,
        ["workspace/repo/" + name]: "existing",
      });
      await expect(
        transferFile(
          { path: "old.txt", storageSession: session },
          { path: "new.txt", storageSession: session },
          { move: true },
        ),
      ).rejects.toThrow("FILE_ALREADY_EXISTS");
      expect(api.copy).not.toHaveBeenCalled();
      expect(api.remove).not.toHaveBeenCalled();
    },
  );
  it.each([false, true])(
    "creates nested target folders when transferring (move=%s)",
    async (move) => {
      const { session, objects } = fixture(initial);
      await transferFile(
        { path: "old.txt", storageSession: session },
        { path: "new/nested/new.txt", storageSession: session },
        { move },
      );
      for (const suffix of ["", MDC, TRANSCRIPT]) {
        expect(
          await objects
            .get("workspace/repo/new/nested/new.txt" + suffix)!
            .text(),
        ).toBe(
          initial[("workspace/repo/old.txt" + suffix) as keyof typeof initial],
        );
        expect(objects.has("workspace/repo/old.txt" + suffix)).toBe(!move);
      }
    },
  );
  it.each(["blocked", "existing/blocked"])(
    "rejects a file at ancestor %s before changing anything",
    async (parent) => {
      const { session, api, objects } = fixture({
        ...initial,
        ["workspace/repo/" + parent]: "keep",
      });
      await expect(
        transferFile(
          { path: "old.txt", storageSession: session },
          { path: parent + "/nested/new.txt", storageSession: session },
          { move: true },
        ),
      ).rejects.toThrow("TARGET_FOLDER_IS_FILE");
      expect(api.copy).not.toHaveBeenCalled();
      expect(api.remove).not.toHaveBeenCalled();
      expect(await objects.get("workspace/repo/" + parent)!.text()).toBe(
        "keep",
      );
    },
  );
  it("rolls back created copies when a sidecar fails without touching source", async () => {
    const { session, api, objects } = fixture(initial);
    api.copy
      .mockImplementationOnce(async (from, to) => {
        objects.set(to, objects.get(from)!);
        return { error: null };
      })
      .mockResolvedValueOnce({ error: new Error("sidecar failed") });
    await expect(
      transferFile(
        { path: "old.txt", storageSession: session },
        { path: "new.txt", storageSession: session },
        { move: true },
      ),
    ).rejects.toThrow("sidecar failed");
    expect([...objects.keys()]).toEqual(Object.keys(initial));
  });
  it("rolls back the destination if the source changes while copying", async () => {
    const { session, api, objects } = fixture(initial);
    const originalCopy = api.copy.getMockImplementation()!;
    api.copy.mockImplementation(async (from, to) => {
      const result = await originalCopy(from, to);
      if (from.endsWith(TRANSCRIPT))
        objects.set("workspace/repo/old.txt", new Blob(["modified"]));
      return result;
    });
    await expect(
      transferFile(
        { path: "old.txt", storageSession: session },
        { path: "new.txt", storageSession: session },
        { move: true },
      ),
    ).rejects.toThrow("SOURCE_CHANGED_DURING_COPY");
    expect(objects.has("workspace/repo/new.txt")).toBe(false);
    expect(await objects.get("workspace/repo/old.txt")!.text()).toBe(
      "modified",
    );
  });
  it("keeps source intact when updating its index fails", async () => {
    const { session, objects } = fixture(initial);
    await expect(
      transferFile(
        { path: "old.txt", storageSession: session },
        { path: "new.txt", storageSession: session },
        {
          move: true,
          beforeRemove: async () => {
            throw new Error("index failed");
          },
        },
      ),
    ).rejects.toThrow("index failed");
    expect([...objects.keys()]).toEqual(Object.keys(initial));
  });
  it("retains a complete copy and reports source deletion failures", async () => {
    const { session, api, objects } = fixture(initial);
    api.remove.mockResolvedValue({ error: new Error("failed") } as any);
    await expect(
      transferFile(
        { path: "old.txt", storageSession: session },
        { path: "new.txt", storageSession: session },
        { move: true },
      ),
    ).rejects.toThrow("COPIED_SOURCE_DELETE_FAILED");
    expect(objects.has("workspace/repo/old.txt")).toBe(true);
    expect(objects.has("workspace/repo/new.txt")).toBe(true);
  });
  it("rejects changing extensions and folder sources", async () => {
    const { session } = fixture(initial);
    await expect(
      rename(
        { path: "old.txt", storageSession: session, supabase: {} as any },
        "new.pdf",
      ),
    ).rejects.toThrow("EXTENSION");
    await expect(
      transferFile(
        { path: "", storageSession: session },
        { path: "new.txt", storageSession: session },
      ),
    ).rejects.toThrow();
  });
});
describe("storage authorization", () => {
  it.each(["user", "editor", "workspace-admin", "admin"])(
    "requires write role for %s",
    async (role) => {
      const q = query({ data: { organization_id: "workspace" }, error: null });
      const supabase = {
        from: () => q,
        auth: {
          getClaims: async () => ({
            data: {
              claims: {
                organization_roles:
                  role === "admin"
                    ? "admin"
                    : [{ organization_id: "workspace", role }],
              },
            },
            error: null,
          }),
        },
      } as any;
      await requireStorageAccess(storage, "read", { supabase });
      if (role === "user")
        await expect(
          requireStorageAccess(storage, "write", { supabase }),
        ).rejects.toThrow("NOT_AUTHORIZED");
      else await requireStorageAccess(storage, "write", { supabase });
    },
  );
  it("authorizes a sessionless worker using its trusted JWT claims while preserving role and RLS checks", async () => {
    const getClaims = vi.fn(() => {
      throw new Error("No browser session");
    });
    const supabase = {
      from: () =>
        query({ data: { organization_id: "workspace" }, error: null }),
      auth: { getClaims },
    } as any;
    await requireStorageAccess(storage, "write", {
      supabase,
      authenticatedClaims: [{ organization_id: "workspace", role: "editor" }],
    });
    for (const authenticatedClaims of [
      [],
      [{ organization_id: "other", role: "editor" }],
      [{ organization_id: "workspace", role: "user" }],
    ] as const) {
      await expect(
        requireStorageAccess(storage, "write", {
          supabase,
          authenticatedClaims: [...authenticatedClaims],
        }),
      ).rejects.toThrow("NOT_AUTHORIZED");
    }
    expect(getClaims).not.toHaveBeenCalled();
    supabase.from = () => query({ data: null, error: null });
    await expect(
      requireStorageAccess(storage, "write", {
        supabase,
        authenticatedClaims: "admin",
      }),
    ).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("rejects forged workspace identifiers and inaccessible activities", async () => {
    const supabase = {
      from: () => query({ data: { organization_id: "other" }, error: null }),
    } as any;
    await expect(
      requireStorageAccess(storage, "write", { supabase }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    supabase.from = () => query({ data: null, error: null });
    await expect(
      requireStorageAccess(
        { type: "activity", activityId: "activity", agentId: "agent" },
        "write",
        { supabase },
      ),
    ).rejects.toThrow("NOT_AUTHORIZED");
    await expect(
      requireStorageAccess({ ...storage, workspaceId: "../escape" }, "read", {
        supabase,
      }),
    ).rejects.toThrow("INVALID_STORAGE");
  });
});
it("finds pending/claimed tasks by physical storage path without crossing workspaces", () => {
  const document = new Doc();
  addTask(document, {
    id: "task",
    type: "process-file",
    state: "pending",
    requiredCapabilities: [],
    parameters: { storage, path: "file.txt", userId: "user", userClaims: [] },
  });
  expect(findActiveFileTask(document, storage, "/file.txt")?.id).toBe("task");
  expect(
    findActiveFileTask(
      document,
      { ...storage, workspaceId: "other" },
      "file.txt",
    ),
  ).toBeUndefined();
  document.destroy();
});
