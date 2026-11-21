import { query } from "./helpers/supabase.ts";
import { expect, it, vi } from "vitest";
import { cleanupXRAGTransfers } from "../packages/database/src/xrag/cleanupXRAGTransfers.ts";
import { getXRAGUserId } from "../packages/database/src/xrag/authentication.ts";
it.each([null, []])(
  "does not call Storage when no transfers expired: %j",
  async (data) => {
    const supabase = {
      from: vi.fn(() => query({ error: null })),
      rpc: vi.fn(async () => ({ data, error: null })),
      storage: { from: vi.fn() },
    };
    await cleanupXRAGTransfers({ supabase: supabase as any });
    expect(supabase.storage.from).not.toHaveBeenCalled();
  },
);
it("deletes only the server-selected expired transfer paths", async () => {
  const remove = vi.fn(async () => ({ error: null }));
  const supabase = {
    from: vi.fn(() => query({ error: null })),
    rpc: vi.fn(async (name: string) => ({
      data:
        name === "expired_xrag_prepared_uploads"
          ? []
          : [{ name: "expired/archive.tar" }],
      error: null,
    })),
    storage: { from: vi.fn(() => ({ remove })) },
  };
  await cleanupXRAGTransfers({ supabase: supabase as any });
  expect(supabase.rpc).toHaveBeenCalledWith("expired_xrag_transfers");
  expect(supabase.storage.from).toHaveBeenCalledWith("xrag-transfers");
  expect(remove).toHaveBeenCalledWith(["expired/archive.tar"]);
});
it.each([true, false])(
  "reports expiration query and Storage failures: %s",
  async (queryFails) => {
    const remove = vi.fn(async () => ({
      error: new Error("private storage error"),
    }));
    const supabase = {
      from: vi.fn(() => query({ error: null })),
      rpc: vi.fn(async (name: string) => ({
        data:
          name === "expired_xrag_prepared_uploads" ? [] : [{ name: "expired" }],
        error: queryFails ? new Error("private db error") : null,
      })),
      storage: { from: vi.fn(() => ({ remove })) },
    };
    await expect(
      cleanupXRAGTransfers({ supabase: supabase as any }),
    ).rejects.toThrow("XRAG_TRANSFER_CLEANUP_FAILED");
    if (queryFails) expect(remove).not.toHaveBeenCalled();
  },
);
it("uses the authenticated browser user when no verified MCP context was supplied", async () => {
  const supabase = {
    from: vi.fn(() => query({ error: null })),
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user" } },
        error: null,
      })),
    },
  };
  await expect(getXRAGUserId({ supabase: supabase as any })).resolves.toBe(
    "user",
  );
});
it("cleans expired prepared inventories as well as orphaned child objects", async () => {
  const remove = vi.fn(async () => ({ error: null }));
  const supabase = {
    from: vi.fn(() => query({ data: null, error: null })),
    storage: { from: vi.fn(() => ({ remove })) },
    rpc: vi.fn(async (name: string, args?: { p_paths: string[] }) => ({
      data:
        name === "removable_xrag_objects"
          ? args!.p_paths
          : name === "expired_xrag_prepared_uploads"
            ? [{ source_path: "expired/upload.tar" }]
            : [],
      error: null,
    })),
  };
  await cleanupXRAGTransfers({ supabase: supabase as any });
  expect(remove).toHaveBeenCalledWith(["expired/upload.tar"]);
  expect(supabase.from).toHaveBeenCalledWith("xrag_prepared_uploads");
});
it("reports a failed orphan-expiration query after checking prepared inventories", async () => {
  const supabase = {
    rpc: vi.fn(async (name: string) => ({
      data: [],
      error:
        name === "expired_xrag_prepared_objects" ? new Error("offline") : null,
    })),
  };
  await expect(
    cleanupXRAGTransfers({ supabase: supabase as any }),
  ).rejects.toThrow("XRAG_TRANSFER_CLEANUP_FAILED");
});
