import { beforeEach, expect, it, vi } from "vitest";
import { getRepositoryExportFiles } from "../packages/database/src/xrag/getRepositoryExportFiles.ts";
import { TEXT_WRITE_FILE_EXTENSION } from "../packages/database/src/storage/_utils/toStorageObjectArray.ts";
import type { XRAGOptions } from "../packages/database/src/xrag/authentication.ts";

const fetchFile = vi.hoisted(() => vi.fn());
vi.mock("undici", () => ({ fetch: fetchFile }));

function storage(
  rows: { name: string; metadata: Record<string, unknown> | null }[],
) {
  const list = vi.fn().mockResolvedValue({ data: rows });
  const sign = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: "https://storage.test/file" } });
  const source = (signal?: AbortSignal) =>
    getRepositoryExportFiles("repo", "workspace", {
      supabase: { storage: { from: () => ({ list, createSignedUrl: sign }) } },
      signal,
    } as unknown as XRAGOptions);
  return { list, sign, source };
}

beforeEach(() => {
  fetchFile.mockReset();
});

it("traverses folders and uses HTTP lengths only when Storage has no size", async () => {
  const { list, source } = storage([]);
  list
    .mockResolvedValueOnce({ data: [{ name: "folder", metadata: null }] })
    .mockResolvedValueOnce({
      data: [
        { name: "empty", metadata: { size: 0, mimetype: "text/plain" } },
        { name: "known", metadata: {} },
        { name: "unknown", metadata: {} },
      ],
    });
  fetchFile
    .mockResolvedValueOnce(new Response(""))
    .mockResolvedValueOnce(
      new Response("bytes", { headers: { "Content-Length": "5" } }),
    )
    .mockResolvedValueOnce(new Response("stream"));
  const files = [];
  for await (const file of source()) {
    const body = Buffer.concat(await Array.fromAsync(file.content)).toString();
    files.push({
      path: file.path,
      size: file.size,
      mime: file.contentType,
      body,
    });
  }
  expect(files).toEqual([
    { path: "folder/empty", size: 0, mime: "text/plain", body: "" },
    {
      path: "folder/known",
      size: 5,
      mime: "application/octet-stream",
      body: "bytes",
    },
    {
      path: "folder/unknown",
      size: undefined,
      mime: "application/octet-stream",
      body: "stream",
    },
  ]);
});

it.each([
  [`document${TEXT_WRITE_FILE_EXTENSION}`, "XRAG_REPOSITORY_WRITE_PENDING"],
  ["sub/file", "XRAG_UNSAFE_PATH"],
  [".", "XRAG_UNSAFE_PATH"],
])(
  "rejects incomplete or invalid Storage entries before signing (%s)",
  async (name, error) => {
    const { sign, source } = storage([{ name, metadata: {} }]);
    await expect(source().next()).rejects.toThrow(error);
    expect(sign).not.toHaveBeenCalled();
    expect(fetchFile).not.toHaveBeenCalled();
  },
);

it.each([{ data: null }, { error: new Error("private storage error") }])(
  "rejects a failed Storage signature before opening a file",
  async (result) => {
    const { sign, source } = storage([{ name: "file", metadata: {} }]);
    sign.mockResolvedValueOnce(result);
    await expect(source().next()).rejects.toThrow("XRAG_FILE_UNAVAILABLE");
    expect(fetchFile).not.toHaveBeenCalled();
  },
);

it("cancels the Storage error body without publishing it as file content", async () => {
  const { source } = storage([{ name: "file", metadata: {} }]);
  const cancel = vi.fn();
  fetchFile.mockResolvedValue(
    new Response(new ReadableStream({ cancel }), { status: 404 }),
  );
  await expect(source().next()).rejects.toThrow("XRAG_FILE_UNAVAILABLE");
  expect(cancel).toHaveBeenCalledOnce();
  fetchFile.mockResolvedValue(new Response(null, { status: 204 }));
  await expect(source().next()).rejects.toThrow("XRAG_FILE_UNAVAILABLE");
});

it("stops the in-flight source request when the browser abandons the export", async () => {
  const { source } = storage([{ name: "file", metadata: {} }]);
  const stop = new AbortController();
  const started = Promise.withResolvers<void>();
  fetchFile.mockImplementation((_url, { signal }) => {
    started.resolve();
    return new Promise((_, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    );
  });
  const pending = source(stop.signal).next();
  await started.promise;
  stop.abort(new Error("download cancelled"));
  await expect(pending).rejects.toThrow("download cancelled");
});
