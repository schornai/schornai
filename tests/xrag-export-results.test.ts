import { beforeEach, expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { listXRAGExportJobs } from "../packages/database/src/xrag/listXRAGExportJobs.ts";
import { deleteXRAGExport } from "../packages/database/src/xrag/deleteXRAGExport.ts";
import { cancelXRAGExport } from "../packages/database/src/xrag/cancelXRAGExport.ts";
import { getXRAGExportDownload } from "../packages/database/src/xrag/getXRAGExportDownload.ts";
const auth = vi.hoisted(() => ({ resource: vi.fn(), model: vi.fn() }));
vi.mock("../packages/database/src/xrag/getAuthorizedResource.ts", () => ({
  getAuthorizedResource: auth.resource,
}));
vi.mock("../packages/database/src/xrag/getXRAGPackageModel.ts", () => ({
  getXRAGPackageModel: auth.model,
}));
const jobId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.resetAllMocks());
function fixture(data: any) {
  const q = query({ data, error: null });
  const signed = vi.fn(async () => ({
    data: { signedUrl: "https://storage.test/download" },
    error: null,
  }));
  const remove = vi.fn(async (_paths: string[]) => ({
    error: null as unknown,
  }));
  const client = {
    from: vi.fn(() => q),
    storage: { from: vi.fn(() => ({ createSignedUrl: signed, remove })) },
  };
  return {
    q,
    signed,
    remove,
    options: {
      supabase: client as any,
      supabaseServiceRole: client as any,
      authenticated: { userId: "owner", claims: "admin" as const },
    },
  };
}
it("restores only this owner's recent jobs and keeps lease secrets off the response", async () => {
  const f = fixture([]);
  expect(await listXRAGExportJobs(f.options)).toEqual([]);
  expect(f.q.eq).toHaveBeenCalledWith("user_id", "owner");
  expect(f.q.gte).toHaveBeenCalled();
  expect(f.q.select.mock.calls[0]![0]).not.toMatch(
    /claims|owner_token|object_path/,
  );
});
it("cancels only an owned active job and removes its lease atomically", async () => {
  const f = fixture({ id: jobId });
  await cancelXRAGExport({ jobId }, f.options);
  expect(f.q.eq).toHaveBeenCalledWith("user_id", "owner");
  expect(f.q.in).toHaveBeenCalledWith("state", ["queued", "processing"]);
  expect(f.q.update).toHaveBeenCalledWith(
    expect.objectContaining({
      state: "cancelled",
      owner_token: null,
      lease_until: null,
    }),
  );
});
it("rejects cancellation of missing, finished or foreign jobs", async () => {
  const f = fixture(null);
  await expect(cancelXRAGExport({ jobId }, f.options)).rejects.toThrow(
    "XRAG_EXPORT_FAILED",
  );
});
it.each(["finished", "error", "cancelled"])(
  "deletes only an owned terminal %s job and its archive",
  async (state) => {
    const path = state === "finished" ? "owner/attempt/archive.tar" : null;
    const f = fixture({ state, object_path: path });
    await deleteXRAGExport({ jobId }, f.options);
    expect(f.q.eq).toHaveBeenCalledWith("id", jobId);
    expect(f.q.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(f.q.in).toHaveBeenCalledWith("state", [
      "finished",
      "cancelled",
      "error",
    ]);
    expect(f.q.delete).toHaveBeenCalledOnce();
    if (path) expect(f.remove).toHaveBeenCalledExactlyOnceWith([path]);
    else expect(f.remove).not.toHaveBeenCalled();
  },
);
it("retains the job for retry when removing the stored archive fails", async () => {
  const f = fixture({
    state: "finished",
    object_path: "owner/attempt/archive.tar",
  });
  f.remove.mockResolvedValueOnce({ error: { message: "storage error" } });
  await expect(deleteXRAGExport({ jobId }, f.options)).rejects.toThrow(
    "XRAG_EXPORT_FAILED",
  );
  expect(f.q.delete).not.toHaveBeenCalled();
});
it("rejects missing, foreign or active jobs before removing files", async () => {
  const f = fixture(null);
  await expect(deleteXRAGExport({ jobId }, f.options)).rejects.toThrow(
    "XRAG_EXPORT_FAILED",
  );
  expect(f.remove).not.toHaveBeenCalled();
  expect(f.q.delete).not.toHaveBeenCalled();
});
it("authorizes every source before signing a fresh URL", async () => {
  const f = fixture({
    name: "archive.tar",
    object_path: "owner/attempt/archive.tar",
    updated_at: new Date().toISOString(),
    selections: [
      { kind: "agent", id: "agent" },
      { kind: "model", id: "model" },
    ],
  });
  expect(await getXRAGExportDownload({ jobId }, f.options)).toMatchObject({
    url: "https://storage.test/download",
  });
  expect(auth.resource).toHaveBeenCalledWith("agent", "agent", f.options);
  expect(auth.model).toHaveBeenCalledWith("model", f.options);
  expect(f.signed).toHaveBeenCalledWith("owner/attempt/archive.tar", 600, {
    download: "archive.tar",
  });
});
it.each([
  null,
  { name: "archive", object_path: null },
  { object_path: "owner/attempt/file", updated_at: "2020-01-01T00:00:00Z" },
])("does not sign missing or expired results", async (data) => {
  const f = fixture(data);
  await expect(getXRAGExportDownload({ jobId }, f.options)).rejects.toThrow(
    "XRAG_EXPORT_FAILED",
  );
  expect(f.signed).not.toHaveBeenCalled();
});
it("does not expose a finished export after source permission is revoked", async () => {
  const f = fixture({
    name: "archive",
    object_path: "owner/attempt/file",
    updated_at: new Date().toISOString(),
    selections: [{ kind: "agent", id: "agent" }],
  });
  auth.resource.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  await expect(getXRAGExportDownload({ jobId }, f.options)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(f.signed).not.toHaveBeenCalled();
});

it("surfaces signing failures instead of returning an unusable link", async () => {
  const f = fixture({
    name: "archive",
    object_path: "owner/attempt/file",
    updated_at: new Date().toISOString(),
    selections: [],
  });
  f.signed.mockResolvedValueOnce({
    data: null as any,
    error: { message: "private" } as any,
  });
  await expect(getXRAGExportDownload({ jobId }, f.options)).rejects.toThrow(
    "XRAG_EXPORT_FAILED",
  );
});
it("rejects reader-only callers before accessing export jobs", async () => {
  const f = fixture([]);
  const options = {
    ...f.options,
    authenticated: {
      userId: "owner",
      claims: [{ organization_id: "workspace", role: "user" as const }],
    },
  };
  await expect(deleteXRAGExport({ jobId }, options)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  await expect(listXRAGExportJobs(options)).rejects.toThrow("NOT_AUTHORIZED");
  await expect(cancelXRAGExport({ jobId }, options)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  await expect(getXRAGExportDownload({ jobId }, options)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(f.q.select).not.toHaveBeenCalled();
});
