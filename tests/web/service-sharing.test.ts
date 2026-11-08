import { beforeEach, expect, it, vi } from "vitest";
import { GET as catalog } from "../../apps/web/app/api/service/artifacts/route.ts";
import { GET as download } from "../../apps/web/app/api/service/artifacts/[id]/route.ts";
import { deleteArtifact } from "../../apps/web/app/(settings)/artifacts/_actions/deleteArtifact.ts";
import { submitXRAG } from "../../apps/web/app/(settings)/settings/xrag/_actions/submitXRAG.ts";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  stream: vi.fn(),
  publish: vi.fn(),
  remove: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("next-i18next/server", () => ({
  initServerI18next: vi.fn(),
  getT: async () => ({ t: (key: string) => key }),
}));
vi.mock("@schornio/aibox-package-database/xrag/publishArtifact", () => ({
  publishArtifact: mocks.publish,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: mocks.create,
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: mocks.admin,
}));
vi.mock("@schornio/aibox-package-database/xrag/listArtifacts", () => ({
  listArtifacts: mocks.list,
}));
vi.mock("@schornio/aibox-package-database/xrag/getArtifact", () => ({
  getArtifact: mocks.get,
}));
vi.mock(
  "@schornio/aibox-package-database/xrag/getPublishedArtifactStream",
  () => ({
    getPublishedArtifactStream: mocks.stream,
  }),
);
vi.mock(
  "@schornio/aibox-realtime/documents/artifactCatalog/ArtifactCatalogSession",
  () => ({
    ArtifactCatalogSession: class {
      publish = mocks.publish;
      remove = mocks.remove;
      async [Symbol.asyncDispose]() {}
    },
  }),
);
vi.mock("@schornio/aibox-realtime/server/getRealtimeServerToken", () => ({
  getRealtimeServerToken: () => "Worker test",
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (fn: any) => (input: any) =>
        fn({ parsedInput: schema.parse(input) }),
    }),
  },
}));
const id = "a".repeat(64);
const request = (suffix = "", token = "t".repeat(64)) =>
  new Request(`http://example.test/api/service/artifacts${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SERVICE_API_TOKEN", "t".repeat(64));
  mocks.create.mockReturnValue({});
  mocks.admin.mockResolvedValue({});
});
it("authorizes machine reads before creating a privileged database client", async () => {
  expect((await catalog(request("", "wrong"))).status).toBe(401);
  expect(
    (
      await download(request(`/${id}`, "wrong"), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(401);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("fails closed when the sharing key is unconfigured or weak", async () => {
  vi.stubEnv("SERVICE_API_TOKEN", "short");
  expect((await catalog(request("", "short"))).status).toBe(401);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("validates pagination and never exposes internal errors", async () => {
  expect((await catalog(request("?offset=-1"))).status).toBe(400);
  mocks.list.mockRejectedValue(new Error("secret database connection"));
  const response = await catalog(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("secret");
});
it("streams only a published content-addressed archive without redirecting credentials", async () => {
  mocks.get.mockResolvedValue({ id, size: 7 });
  mocks.stream.mockResolvedValue(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("archive"));
        controller.close();
      },
    }),
  );
  const response = await download(request(`/${id}`), {
    params: Promise.resolve({ id }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(await response.text()).toBe("archive");
  expect(mocks.stream.mock.calls[0]?.[0]).toBe(id);
});
it("requires a global admin to publish and rejects paths into the catalog", async () => {
  mocks.admin.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  await expect(submitXRAG({ actionFileName: "model.tar" })).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(mocks.publish).not.toHaveBeenCalled();
  expect(() => submitXRAG({ actionFileName: `catalog/${id}.json` })).toThrow();
  mocks.publish.mockResolvedValue(id);
  await expect(submitXRAG({ actionFileName: "model.tar" })).resolves.toEqual({
    id,
  });
});

it("refuses to stream withdrawn archives even before purge completes", async () => {
  mocks.get.mockResolvedValue({
    id,
    size: 7,
    deletedAt: new Date().toISOString(),
  });
  expect(
    (await download(request(`/${id}`), { params: Promise.resolve({ id }) }))
      .status,
  ).toBe(404);
  expect(mocks.stream).not.toHaveBeenCalled();
});

it("authorizes artifact deletion in the action and validates content IDs", async () => {
  mocks.admin.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  await expect(deleteArtifact({ id })).rejects.toThrow("NOT_AUTHORIZED");
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(() => deleteArtifact({ id: "../catalog" })).toThrow();
  await expect(deleteArtifact({ id })).resolves.toEqual({ id });
  expect(mocks.remove).toHaveBeenCalledWith(id, { supabase: {} });
});

it("serves a resumed download with correct length, range and immutable identity", async () => {
  mocks.get.mockResolvedValue({ id, size: 7 });
  mocks.stream.mockResolvedValue(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("hive"));
        controller.close();
      },
    }),
  );
  const input = request(`/${id}`);
  input.headers.set("Range", "bytes=3-");
  const response = await download(input, { params: Promise.resolve({ id }) });
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toBe("bytes 3-6/7");
  expect(response.headers.get("content-length")).toBe("4");
  expect(response.headers.get("etag")).toBe(`"${id}"`);
  expect(await response.text()).toBe("hive");
  expect(mocks.stream).toHaveBeenCalledWith(
    id,
    expect.objectContaining({ range: { start: 3, end: 6, size: 7 } }),
  );
});

it.each(["bytes=7-", "bytes=3-2", "bytes=0-99", "bytes=0-1,3-4"])(
  "rejects unsupported range %s before opening storage",
  async (range) => {
    mocks.get.mockResolvedValue({ id, size: 7 });
    const input = request(`/${id}`);
    input.headers.set("Range", range);
    const response = await download(input, { params: Promise.resolve({ id }) });
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */7");
    expect(mocks.stream).not.toHaveBeenCalled();
  },
);
