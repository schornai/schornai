import { getPreparedXRAGImport } from "../packages/database/src/xrag/getPreparedXRAGImport.ts";
import { query } from "./helpers/supabase.ts";
import { expect, it, vi } from "vitest";
import { listXRAGTransfers } from "../packages/database/src/xrag/listXRAGTransfers.ts";
import { deleteXRAGTransfer } from "../packages/database/src/xrag/deleteXRAGTransfer.ts";
const recent = new Date(Date.now() - 60_000).toISOString();
const older = new Date(Date.now() - 120_000).toISOString();
const user = "11111111-1111-4111-8111-111111111111";
const folder = "22222222-2222-4222-8222-222222222222";
const path = user + "/" + folder + "/archive.tar";
function options() {
  const list = vi.fn(async (prefix: string, _opts: any) => ({
    data:
      prefix === user
        ? [{ id: null, name: folder }]
        : [
            {
              id: "file",
              name: "archive.tar",
              created_at: recent,
              metadata: { size: 1234 },
            },
          ],
    error: null as any,
  }));
  const remove = vi.fn(async () => ({ error: null as any }));
  return {
    list,
    remove,
    opts: {
      authenticated: {
        userId: user,
        claims: [{ organization_id: "workspace", role: "workspace-admin" }],
      },
      supabase: {
        from: vi.fn(() => query({ data: [], error: null })),
        storage: { from: vi.fn(() => ({ list })) },
      },
      supabaseServiceRole: {
        from: vi.fn(() => query({ data: null, error: null })),
        storage: { from: vi.fn(() => ({ remove })) },
      },
    },
  } as any;
}
it("restores the caller's archives through Storage without relying on browser state", async () => {
  const f = options();
  expect(await listXRAGTransfers(f.opts)).toEqual([
    {
      id: folder,
      path,
      name: "archive.tar",
      createdAt: recent,
      size: 1234,
    },
  ]);
  expect(f.list.mock.calls.map((args: any) => args[0])).toEqual([
    user,
    user + "/" + folder,
  ]);
});
it("paginates folders and ignores unexpected nested paths and directory entries", async () => {
  const f = options();
  f.list.mockImplementation(async (prefix: string, { offset }: any) => ({
    data:
      prefix === user
        ? offset === 0
          ? [
              { id: null, name: folder },
              ...Array.from({ length: 99 }, () => ({
                id: null,
                name: "invalid",
              })),
            ]
          : []
        : [
            { id: null, name: "nested" },
            { id: "f", name: "../bad", created_at: null },
            { id: "1", name: "older.tar", created_at: older },
            { id: "2", name: "newer.tar", created_at: recent },
            { id: "3", name: "unknown.tar", created_at: null },
            {
              id: "4",
              name: "expired.tar",
              created_at: new Date(Date.now() - 3700_000).toISOString(),
            },
          ],
    error: null,
  }));
  const result = await listXRAGTransfers(f.opts);
  expect(result.map((file) => file.name)).toEqual(["newer.tar", "older.tar"]);
  expect(f.list).toHaveBeenCalledWith(
    user,
    expect.objectContaining({ offset: 100 }),
  );
});
it("deletes only the exact owned archive and propagates sanitized Storage errors", async () => {
  const f = options();
  await deleteXRAGTransfer({ path }, f.opts);
  expect(f.remove).toHaveBeenCalledWith([path]);
  f.remove.mockResolvedValue({ error: new Error("secret storage details") });
  await expect(deleteXRAGTransfer({ path }, f.opts)).rejects.toThrow(
    "XRAG_TRANSFER_DELETE_FAILED",
  );
});
it("rejects another user's archive, path traversal and insufficient permissions before deletion", async () => {
  const f = options();
  await expect(
    deleteXRAGTransfer({ path: path.replace(user, folder) }, f.opts),
  ).rejects.toThrow("NOT_AUTHORIZED");
  await expect(
    deleteXRAGTransfer({ path: user + "/" + folder + "/../bad" }, f.opts),
  ).rejects.toThrow();
  f.opts.authenticated.claims = [];
  await expect(deleteXRAGTransfer({ path }, f.opts)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  await expect(listXRAGTransfers(f.opts)).rejects.toThrow("NOT_AUTHORIZED");
  expect(f.remove).not.toHaveBeenCalled();
  expect(f.list).not.toHaveBeenCalled();
});
it("fails visibly when stored archives cannot be listed", async () => {
  const f = options();
  f.list.mockResolvedValue({ data: null, error: new Error("private") });
  await expect(listXRAGTransfers(f.opts)).rejects.toThrow(
    "XRAG_TRANSFER_LIST_FAILED",
  );
});

it.each([undefined, -1, "100", Infinity, NaN, 0, 1024])(
  "returns only valid byte sizes from metadata: %s",
  async (size) => {
    const f = options();
    f.list.mockImplementation(async (prefix: string) => ({
      data:
        prefix === user
          ? [{ id: null, name: folder }]
          : [
              {
                id: "file",
                name: "archive.tar",
                created_at: recent,
                metadata: { size },
              },
            ],
      error: null,
    }));
    const [file] = await listXRAGTransfers(f.opts);
    expect(file?.size).toBe(
      typeof size === "number" && Number.isFinite(size) && size >= 0
        ? size
        : null,
    );
  },
);
it("lists the prepared inventory after the outer file is deleted, without duplicating retained originals", async () => {
  const f = options();
  f.opts.supabase.from.mockImplementation(() =>
    query({
      data: [
        {
          id: folder,
          source_path: path,
          name: "archive.tar",
          size: 128849018880,
          created_at: recent,
        },
      ],
      error: null,
    }),
  );
  expect(await listXRAGTransfers(f.opts)).toEqual([
    {
      id: folder,
      path,
      name: "archive.tar",
      size: 128849018880,
      createdAt: recent,
    },
  ]);
  f.list.mockResolvedValue({ data: [], error: null });
  expect(await listXRAGTransfers(f.opts)).toHaveLength(1);
});
it("reports unavailable prepared inventory without silently hiding uploads", async () => {
  const f = options();
  f.opts.supabase.from.mockImplementation(() =>
    query({ data: null, error: new Error("db offline") }),
  );
  await expect(listXRAGTransfers(f.opts)).rejects.toThrow(
    "XRAG_TRANSFER_LIST_FAILED",
  );
});
it.each(["read", "delete"])(
  "keeps inventory failures visible during cleanup: %s",
  async (phase) => {
    const f = options();
    let calls = 0;
    f.opts.supabaseServiceRole.from.mockImplementation(() =>
      query({
        data: null,
        error: phase === "read" || ++calls === 2 ? new Error("private") : null,
      }),
    );
    await expect(deleteXRAGTransfer({ path }, f.opts)).rejects.toThrow(
      "XRAG_TRANSFER_DELETE_FAILED",
    );
  },
);

it("resolves one upload ID in the caller's own folder, including after preparation", async () => {
  const f = options();
  expect(await listXRAGTransfers(f.opts, folder)).toMatchObject([{ path }]);
  expect(f.list.mock.calls.map(([prefix]: [string]) => prefix)).toEqual([
    user + "/" + folder,
  ]);
  const prepared = query({
    data: [
      {
        id: folder,
        source_path: path,
        name: "archive.tar",
        size: 1234,
        created_at: recent,
      },
    ],
    error: null,
  });
  f.opts.supabase.from.mockReturnValue(prepared);
  f.list.mockClear();
  expect(await listXRAGTransfers(f.opts, folder)).toMatchObject([{ path }]);
  expect(prepared.eq).toHaveBeenCalledWith("id", folder);
  expect(prepared.eq).toHaveBeenCalledWith("user_id", user);
  expect(prepared.gt).toHaveBeenCalledWith("created_at", expect.any(String));
  await expect(listXRAGTransfers(f.opts, "..")).rejects.toThrow();
});

it("loads only display fields from the current owner's unexpired prepared selection", async () => {
  const f = options();
  const digest = "d".repeat(64);
  const row = {
    source_path: path,
    name: "archive.tar",
    digest,
    entries: [
      {
        id: digest,
        size: 1024,
        xrag: {
          xrag_version: 2,
          xrag_type: "resource",
          resourceType: "documentRepository",
          id: "guide",
          data: { name: "Guide", description: "", type: "database-v2" },
          references: [],
        },
      },
    ],
  };
  const q = query({ data: row, error: null });
  f.opts.supabase.from.mockReturnValue(q);
  const result = await getPreparedXRAGImport(folder, f.opts);
  expect(q.eq).toHaveBeenCalledWith("user_id", user);
  expect(q.eq).toHaveBeenCalledWith("id", folder);
  expect(q.gt).toHaveBeenCalledWith("created_at", expect.any(String));
  expect(result).toEqual({
    source: { path, name: "archive.tar" },
    digest,
    isCollection: false,
    entries: [
      {
        archiveId: digest,
        size: 1024,
        kind: "documentRepository",
        name: "Guide",
        description: "",
        needsWorkspace: true,
      },
    ],
  });
  expect(f.list).not.toHaveBeenCalled();
  f.opts.supabase.from.mockReturnValue(query({ data: null }));
  expect(await getPreparedXRAGImport(folder, f.opts)).toBeNull();
  f.opts.supabase.from.mockReturnValue(query({ error: new Error("internal") }));
  await expect(getPreparedXRAGImport(folder, f.opts)).rejects.toThrow(
    "XRAG_TRANSFER_UNAVAILABLE",
  );
  f.opts.authenticated.claims = [];
  await expect(getPreparedXRAGImport(folder, f.opts)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
});
