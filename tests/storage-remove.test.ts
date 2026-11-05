import { beforeEach, expect, it, vi } from "vitest";
import { remove } from "../packages/database/src/storage/remove";
import { StorageSession } from "../packages/database/src/storage/_utils/StorageSession";
import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "../packages/database/src/storage/_utils/toStorageObjectArray";

const prefix = "workspace/repo/";
const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
let files: Set<string>;
let indexes: { database_id: string; url: string }[];
let events: string[];
let indexError: boolean;
let storageError: boolean;
const locks = new Map<string, string>();
const beforeRemove = vi.fn();
const logAction = vi.fn();
const api = {
  list: vi.fn(async (path: string, { search }: { search?: string }) => {
    path = path.replace(/\/$/, "");
    const entries = new Map<string, boolean>();
    for (const key of files) {
      if (!key.startsWith(path + "/")) continue;
      const relative = key.slice(path.length + 1);
      const name = relative.split("/")[0]!;
      if (!search || name.includes(search))
        entries.set(name, !relative.includes("/"));
    }
    return {
      data: [...entries].map(([name, file]) => ({
        name,
        metadata: file ? { size: 1, mimetype: "text/plain" } : null,
      })),
      error: null,
    };
  }),
  remove: vi.fn(async (paths: string[]) => {
    events.push("objects:" + paths[0]);
    if (storageError) return { error: new Error("storage unavailable") };
    paths.forEach((path) => files.delete(path));
    return { error: null };
  }),
};
const supabase = {
  rpc: vi.fn((name, { p_path, p_token }) => ({
    abortSignal: async () => {
      if (name === "release_storage_file_lock") {
        if (locks.get(p_path) === p_token) locks.delete(p_path);
        return { data: null, error: null };
      }
      if (locks.has(p_path) && locks.get(p_path) !== p_token)
        return { data: false, error: null };
      locks.set(p_path, p_token);
      return { data: true, error: null };
    },
  })),
  from: vi.fn((table: string) => {
    expect(table).toBe("sources");
    const filters: Record<string, string> = {};
    const query = {
      delete: () => query,
      eq: (key: string, value: string) => {
        filters[key] = value;
        return query;
      },
      throwOnError: async () => {
        events.push("index:" + filters.url);
        if (indexError) throw new Error("index unavailable");
        indexes = indexes.filter(
          (row) =>
            !Object.entries(filters).every(
              ([key, value]) => row[key as keyof typeof row] === value,
            ),
        );
      },
    };
    return query;
  }),
} as any;
const session = Object.assign(
  new StorageSession({ storage, supabaseStorage: { from: () => api } as any }),
  { logAction },
) as any;
const options = { supabase, beforeRemove };
beforeEach(() => {
  vi.clearAllMocks();
  files = new Set([
    prefix + "folder/a.txt",
    prefix + "folder/a.txt" + MDC_FILE_EXTENSION,
    prefix + "folder/nested/b.wav",
    prefix + "folder/nested/b.wav" + TRANSCRIPT_FILE_EXTENSION,
    prefix + "folder2/keep.txt",
  ]);
  indexes = ["folder/a.txt", "folder/nested/b.wav", "folder2/keep.txt"].map(
    (path) => ({ database_id: "repo", url: "database_files/" + prefix + path }),
  );
  indexes.push({
    database_id: "another-repo",
    url: "database_files/" + prefix + "folder/a.txt",
  });
  events = [];
  indexError = storageError = false;
  locks.clear();
  beforeRemove
    .mockReset()
    .mockImplementation((path: string) =>
      expect(locks.has(prefix + path)).toBe(true),
    );
});

it("clears each nested file's index before its objects, once per canonical path", async () => {
  await remove("folder", session, options);
  expect([...files]).toEqual([prefix + "folder2/keep.txt"]);
  expect(indexes).toEqual([
    {
      database_id: "repo",
      url: "database_files/" + prefix + "folder2/keep.txt",
    },
    {
      database_id: "another-repo",
      url: "database_files/" + prefix + "folder/a.txt",
    },
  ]);
  expect(events).toEqual([
    "index:database_files/" + prefix + "folder/a.txt",
    "objects:" + prefix + "folder/a.txt",
    "index:database_files/" + prefix + "folder/nested/b.wav",
    "objects:" + prefix + "folder/nested/b.wav",
  ]);
  expect(locks.size).toBe(0);
  expect(beforeRemove).toHaveBeenCalledTimes(2);
});

it("stops before touching objects when index cleanup fails", async () => {
  indexError = true;
  await expect(remove("folder", session, options)).rejects.toThrow(
    "index unavailable",
  );
  expect(api.remove).not.toHaveBeenCalled();
  expect(indexes).toHaveLength(4);
  expect(locks.size).toBe(0);
  expect(logAction).not.toHaveBeenCalledWith(
    expect.objectContaining({ state: "removed" }),
  );
});

it("allows retrying object deletion after the index was already removed", async () => {
  storageError = true;
  await expect(remove("folder", session, options)).rejects.toThrow(
    "storage unavailable",
  );
  expect(files.has(prefix + "folder/a.txt")).toBe(true);
  expect(
    indexes.some(
      (row) => row.database_id === "repo" && row.url.endsWith("folder/a.txt"),
    ),
  ).toBe(false);
  storageError = false;
  await remove("folder", session, options);
  expect([...files]).toEqual([prefix + "folder2/keep.txt"]);
});

it("stops at queued work and at a live processing lease", async () => {
  beforeRemove.mockImplementationOnce(() => {
    throw new Error("queued");
  });
  await expect(remove("folder", session, options)).rejects.toThrow("queued");
  expect(events).toEqual([]);
  locks.set(prefix + "folder/a.txt", "worker");
  await expect(remove("folder", session, options)).rejects.toThrow(
    "FILE_PROCESSING_IN_PROGRESS",
  );
  expect(events).toEqual([]);
  expect(locks.get(prefix + "folder/a.txt")).toBe("worker");
});

it("cleans orphaned sidecars using the original path and removes empty folder placeholders", async () => {
  files = new Set([
    prefix + "folder/a.txt" + MDC_FILE_EXTENSION,
    prefix + "folder/a.txt" + TRANSCRIPT_FILE_EXTENSION,
    prefix + "folder/empty/.empty-folder-placeholder",
  ]);
  await remove("folder", session, options);
  expect(files.size).toBe(0);
  expect(beforeRemove.mock.calls.map(([path]) => path)).toEqual([
    "folder/a.txt",
    "folder/empty/.empty-folder-placeholder",
  ]);
  expect(locks.size).toBe(0);
});
