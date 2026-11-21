import { beforeEach, expect, it, vi } from "vitest";
import { exportXRAGPackage } from "../packages/database/src/xrag/exportXRAGPackage.ts";
import { query } from "./helpers/supabase.ts";
const state = vi.hoisted(() => ({
  resource: vi.fn(),
  model: vi.fn(),
}));
vi.mock("../packages/database/src/xrag/getAuthorizedResource.ts", () => ({
  getAuthorizedResource: state.resource,
}));
vi.mock("../packages/database/src/xrag/getModelExportSource.ts", () => ({
  getModelExportSource: state.model,
}));
const packageId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.resetAllMocks());
function fixture(active: any = null) {
  const model = { kind: "model", resource_id: "model" };
  const saved = query({ data: { name: "My Package" } });
  const items = query({ data: [model], count: 1, error: null });
  const from = vi.fn((table: string) =>
    table === "xrag_packages" ? saved : items,
  );
  const activeQuery = query({ data: active, error: null });
  const inserted = query({ data: { id: "job" }, error: null });
  const jobs = {
    select: vi.fn(() => activeQuery),
    insert: vi.fn(() => inserted),
  };
  return {
    jobs,
    saved,
    items,
    model,
    options: {
      supabase: { from } as any,
      supabaseServiceRole: { from: vi.fn(() => jobs) } as any,
      authenticated: { userId: "user", claims: "admin" as const },
    },
  };
}
it("queues only authorized selections and returns immediately without streaming payloads", async () => {
  const f = fixture();
  expect(await exportXRAGPackage({ packageId }, f.options)).toEqual({
    jobId: "job",
  });
  expect(f.saved.eq.mock.calls).toEqual([
    ["id", packageId],
    ["owner_id", "user"],
  ]);
  expect(f.items.select).toHaveBeenCalledWith("kind,resource_id", {
    count: "exact",
  });
  expect(f.items.eq).toHaveBeenCalledWith("package_id", packageId);
  expect(f.jobs.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: "user",
      name: "my-package.xrag.tar",
      claims: "admin",
      selections: [{ kind: "model", id: "model" }],
    }),
  );
});
it("deduplicates active requests for the same owner and package", async () => {
  const f = fixture({ id: "existing" });
  expect(await exportXRAGPackage({ packageId }, f.options)).toEqual({
    jobId: "existing",
  });
  expect(f.jobs.insert).not.toHaveBeenCalled();
});
it("rejects missing packages and revoked object access before queueing", async () => {
  const f = fixture();
  state.model.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  f.saved.maybeSingle.mockResolvedValueOnce({ data: null });
  await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(f.jobs.insert).not.toHaveBeenCalled();
});

it("checks each workspace resource before looking up or starting a mixed package job", async () => {
  const f = fixture();
  f.items.eq.mockResolvedValueOnce({
    data: [f.model, { kind: "documentRepository", resource_id: "repository" }],
    count: 2,
  });
  state.resource.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(state.model).toHaveBeenCalledWith("model", f.options);
  expect(state.resource).toHaveBeenCalledWith(
    "documentRepository",
    "repository",
    f.options,
  );
  expect(f.jobs.select).not.toHaveBeenCalled();
  expect(f.jobs.insert).not.toHaveBeenCalled();
});

it.each([1001, 2])(
  "refuses a truncated selection when the package contains %i items",
  async (count) => {
    const f = fixture();
    f.items.eq.mockResolvedValueOnce({ data: [f.model], count });
    await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
      "XRAG_PACKAGE_SIZE",
    );
    expect(f.jobs.insert).not.toHaveBeenCalled();
  },
);

it("rejects empty packages before starting an export", async () => {
  const f = fixture();
  f.items.eq.mockResolvedValueOnce({ data: [], count: 0 });
  await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
    "XRAG_PACKAGE_SIZE",
  );
  expect(f.jobs.insert).not.toHaveBeenCalled();
});

it.each(["header", "items"])(
  "reports failure to read the package %s",
  async (phase) => {
    const f = fixture();
    (phase === "header"
      ? f.saved.maybeSingle
      : f.items.eq
    ).mockResolvedValueOnce({ error: { message: "offline" } });
    await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
      "XRAG_PACKAGE_READ_FAILED",
    );
    expect(f.jobs.insert).not.toHaveBeenCalled();
  },
);

it("returns the same owner's job when another request wins the unique insert", async () => {
  const f = fixture();
  const winner = query({ data: { id: "other-request" } });
  f.jobs.select
    .mockReturnValueOnce(query({ data: null }))
    .mockReturnValueOnce(winner);
  f.jobs.insert.mockReturnValueOnce(query({ error: { code: "23505" } }));
  await expect(exportXRAGPackage({ packageId }, f.options)).resolves.toEqual({
    jobId: "other-request",
  });
  expect(winner.eq.mock.calls).toEqual([
    ["user_id", "user"],
    ["package_id", packageId],
  ]);
  expect(winner.in).toHaveBeenCalledWith("state", ["queued", "processing"]);
  expect(f.jobs.insert).toHaveBeenCalledTimes(1);
});

it("reports a failed race when the winning job is no longer active", async () => {
  const f = fixture();
  f.jobs.insert.mockReturnValueOnce(
    query({ error: { code: "23505", message: "private" } }),
  );
  await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
    "XRAG_EXPORT_FAILED",
  );
  expect(f.jobs.select).toHaveBeenCalledTimes(2);
  expect(f.jobs.insert).toHaveBeenCalledTimes(1);
});

it("leaves the queue alone when its current state cannot be read", async () => {
  const f = fixture();
  f.jobs.select.mockReturnValueOnce(query({ error: { message: "private" } }));
  await expect(exportXRAGPackage({ packageId }, f.options)).rejects.toThrow(
    "XRAG_EXPORT_FAILED",
  );
  expect(f.jobs.insert).not.toHaveBeenCalled();
});
