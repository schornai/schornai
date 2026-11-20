import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "../../apps/web/app/api/xrag/download/[...path]/route";
import { exportXRAG } from "../../apps/web/app/(main)/app/xrag/_actions/exportXRAG";
import { getXRAGExportDownload } from "../../apps/web/app/(main)/app/xrag/_actions/getXRAGExportDownload";
import { Readable } from "node:stream";
import { inspectArchive } from "../../packages/xrag/src/archive.ts";
import {
  xragFileDownloadUrl,
  xragModelDownloadUrl,
} from "../../apps/web/lib/xrag/downloadUrl";

const state = vi.hoisted(() => ({
  context: vi.fn(),
  source: vi.fn(),
  sign: vi.fn(),
  fetch: vi.fn(),
  resource: vi.fn(),
  job: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: unknown) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("undici", () => ({ fetch: state.fetch }));
vi.mock("@schornio/aibox-package-database/xrag/getResourceExport", () => ({
  getResourceExport: state.resource,
}));
vi.mock("@schornio/aibox-package-database/xrag/getXRAGExportDownload", () => ({
  getXRAGExportDownload: state.job,
}));
vi.mock("@/lib/xrag/getXRAGContext", () => ({ getXRAGContext: state.context }));
vi.mock("@schornio/aibox-package-database/xrag/getModelExportSource", () => ({
  getModelExportSource: state.source,
}));
const digest = "a".repeat(64);
const storage = "http://internal-storage.test";
const key =
  "22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/archive.xrag.tar";
const size = 120 * 1024 ** 3;
const repository = {
  xrag_version: 2,
  xrag_type: "resource",
  resourceType: "documentRepository",
  id: "knowledge",
  data: { name: "Knowledge" },
  references: [],
};

function download(url: string) {
  const request = new Request(new URL(url, "https://app.test"), {
    headers: {
      Range: `bytes=${size - 4}-`,
      "If-Range": '"archive"',
      Authorization: "private",
    },
  });
  const parts = new URL(request.url).pathname
    .slice("/api/xrag/download/".length)
    .split("/")
    .map(decodeURIComponent);
  return GET(request, { params: Promise.resolve({ path: parts }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_URL", storage);
  state.context.mockResolvedValue({
    supabaseServiceRole: {
      storage: { from: () => ({ createSignedUrl: state.sign }) },
    },
  });
  state.source.mockResolvedValue({
    name: "model-large.xrag.tar",
    path: "private/model",
    id: digest,
    size,
  });
  state.sign.mockResolvedValue({
    data: { signedUrl: storage + "/private-signed-original" },
  });
  state.fetch.mockImplementation(
    async () =>
      new Response("last", {
        status: 206,
        headers: {
          "Content-Range": `bytes ${size - 4}-${size - 1}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": "4",
          ETag: '"archive"',
        },
      }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("streams the selected immutable model archive with range support and no export copy", async () => {
  const url = xragModelDownloadUrl("large-model", digest);
  await expect(
    exportXRAG({ kind: "model", id: "large-model" }),
  ).resolves.toEqual({ url });
  expect(state.fetch).not.toHaveBeenCalled();
  expect(url).not.toContain("private/model");
  const response = await download(url);
  expect(state.context).toHaveBeenCalledWith({
    selection: { kind: "model", id: "large-model" },
  });
  expect(state.source).toHaveBeenCalledWith(
    "large-model",
    await state.context.mock.results[0]!.value,
  );
  expect(state.sign).toHaveBeenCalledWith("private/model", 3600);
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toContain(String(size));
  expect(response.headers.get("content-length")).toBe("4");
  expect(response.headers.get("content-disposition")).toContain(
    "model-large.xrag.tar",
  );
  expect(
    new Headers(state.fetch.mock.calls[0]![1].headers).get("authorization"),
  ).toBeNull();
  expect(
    new Headers(state.fetch.mock.calls[0]![1].headers).get("if-range"),
  ).toBe('"archive"');
  expect(await response.text()).toBe("last");
});

it.each(["denied", "replaced", "invalid"])(
  "never streams an inaccessible or different model (%s)",
  async (reason) => {
    if (reason === "denied")
      state.context.mockRejectedValue(new Error("NOT_AUTHORIZED"));
    if (reason === "replaced")
      state.source.mockResolvedValue({ id: "b".repeat(64) });
    const response = await download(
      xragModelDownloadUrl("model", reason === "invalid" ? "invalid" : digest),
    );
    expect(response.status).toBe(404);
    expect(state.sign).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  },
);

it.each(["xrag-exports", "xrag-transfers"])(
  "relays authorized %s downloads on the public app origin",
  async (bucket) => {
    const upstream = `${storage}/storage/v1/object/sign/${bucket}/${key}?token=signed`;
    const url = xragFileDownloadUrl(upstream + "&download=archive.xrag.tar");
    if (bucket === "xrag-exports") {
      state.job.mockResolvedValue({ url: upstream });
      await expect(
        getXRAGExportDownload({ jobId: key.split("/")[1]! }),
      ).resolves.toEqual({ url });
    }
    expect(url).toBe(`/api/xrag/download/${bucket}/${key}?token=signed`);
    const response = await download(url);
    expect(state.fetch).toHaveBeenCalledWith(
      upstream,
      expect.objectContaining({ redirect: "error" }),
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("content-disposition")).toContain(
      "archive.xrag.tar",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("last");
  },
);

it("limits relayed capabilities to signed XRAG output paths and rejects invalid destinations", async () => {
  expect(() =>
    xragFileDownloadUrl(storage + "/unexpected?token=signed"),
  ).toThrow();
  expect(() =>
    xragFileDownloadUrl(
      `${storage}/storage/v1/object/sign/xrag-exports/${key}`,
    ),
  ).toThrow();
  for (const path of [
    `box-action-files/${key}?token=signed`,
    `xrag-exports/${key}`,
    "xrag-exports/private/file?token=signed",
  ]) {
    expect((await download("/api/xrag/download/" + path)).status).toBe(404);
  }
  expect(state.fetch).not.toHaveBeenCalled();
});

it("authorizes a repository and streams an importable single archive without uploading it", async () => {
  const selection = { kind: "documentRepository", id: "repo" } as const;
  const url = "/api/xrag/download/resource/documentRepository/repo";
  await expect(exportXRAG(selection)).resolves.toEqual({ url });
  expect(state.resource).not.toHaveBeenCalled();
  state.resource.mockResolvedValue({
    resource: repository,
    files: [
      {
        path: "docs/notes.txt",
        size: 5,
        content: Readable.from([Buffer.from("notes")]),
      },
    ],
  });
  const response = await download(url);
  expect(state.context).toHaveBeenCalledWith({ selection });
  expect(state.resource).toHaveBeenCalledWith(
    selection.kind,
    selection.id,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("accept-ranges")).toBe("none");
  expect(response.headers.get("content-disposition")).toContain(
    "documentRepository-knowledge.xrag.tar",
  );
  const archive = await inspectArchive(
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
  );
  expect(archive.xrag).toEqual(repository);
  expect(archive.resourceFiles).toEqual([
    {
      path: "docs/notes.txt",
      size: 5,
      contentType: "application/octet-stream",
    },
  ]);
  expect(state.sign).not.toHaveBeenCalled();
});

it("propagates cancellation to an active large document download", async () => {
  let ended = false;
  let signal: AbortSignal | undefined;
  const payload = Buffer.alloc(64 * 1024);
  state.resource.mockImplementation(async (_kind, _id, options) => {
    signal = options.signal;
    return {
      resource: repository,
      files: [
        {
          path: "large.bin",
          size,
          content: (async function* () {
            try {
              yield payload;
              if (!options.signal.aborted)
                await new Promise<void>((resolve) =>
                  options.signal.addEventListener("abort", () => resolve(), {
                    once: true,
                  }),
                );
            } finally {
              ended = true;
            }
          })(),
        },
      ],
    };
  });
  const response = await download(
    "/api/xrag/download/resource/documentRepository/repo",
  );
  const reader = response.body!.getReader();
  while ((await reader.read()).value?.length !== payload.length) {}
  await reader.cancel();
  expect(signal?.aborted).toBe(true);
  expect(ended).toBe(true);
});

it("keeps Storage failures out of otherwise authorized downloads", async () => {
  const url = xragModelDownloadUrl("model", digest);
  state.sign.mockResolvedValueOnce({ data: null, error: new Error("private") });
  expect((await download(url)).status).toBe(404);
  expect(state.fetch).not.toHaveBeenCalled();

  state.fetch.mockResolvedValueOnce(
    new Response("upstream error", { status: 503 }),
  );
  const unavailable = await download(url);
  expect(unavailable.status).toBe(502);
  expect(unavailable.headers.has("content-disposition")).toBe(false);
  expect(await unavailable.text()).toBe("");

  state.fetch.mockResolvedValueOnce(
    new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    }),
  );
  const rangeError = await download(url);
  expect(rangeError.status).toBe(416);
  expect(rangeError.headers.get("content-range")).toBe(`bytes */${size}`);
});
