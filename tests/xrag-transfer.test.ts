import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  access,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { c } from "tar";
import { afterEach, expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { withTransferArchives } from "../packages/database/src/xrag/withTransferArchives.ts";
import { createCollection } from "../packages/xrag/src/collection.ts";
import { previewXRAGImport } from "../packages/database/src/xrag/previewXRAGImport.ts";
import { importXRAGTransfer } from "../packages/database/src/xrag/importXRAGTransfer.ts";
import { createTransferUpload } from "../packages/database/src/xrag/createTransferUpload.ts";
import { inspectArchive } from "../packages/xrag/src/archive.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const path = `${userId}/22222222-2222-4222-8222-222222222222/source.xrag.tar`;
const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function setup(role = "workspace-admin") {
  const root = await mkdtemp(join(tmpdir(), "xrag-transfer-test-"));
  roots.push(root);
  const source = join(root, "source");
  await mkdir(source);
  await writeFile(
    join(source, "xrag.json"),
    JSON.stringify({
      xrag_version: 1,
      xrag_type: "files",
      targets: ["ollama"],
      name: "fixture",
    }),
  );
  await writeFile(join(source, "payload.txt"), "original bytes");
  const file = join(root, "source.tar");
  await c({ cwd: source, file }, ["xrag.json", "payload.txt"]);
  const bytes = await readFile(file);
  const objects = new Map([[path, bytes]]);
  const bucket = {
    info: vi.fn(async () => ({
      data: { createdAt: new Date().toISOString() },
      error: null,
    })),
    createSignedUrl: vi.fn(async (path: string) => ({
      data: { signedUrl: `https://storage.test/${path}` },
      error: null,
    })),
    createSignedUploadUrl: vi.fn(async (path: string) => ({
      data: {
        signedUrl: `https://storage.test/${path}`,
        token: "upload-token",
      },
      error: null,
    })),
    upload: vi.fn(async (path: string, body: AsyncIterable<Buffer>) => {
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(chunk);
      objects.set(path, Buffer.concat(chunks));
      return { data: { path }, error: null };
    }),
  };
  const supabase = {
    auth: {
      getClaims: vi.fn(() => {
        throw new Error("OAuth clients do not have an auth session");
      }),
    },
    from: vi.fn(() => query({ data: null, error: null })),
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };
  const service = {
    storage: { from: vi.fn(() => bucket) },
    from: vi.fn(() => query({ data: null, error: null })),
    rpc: vi.fn(),
  };
  const fetchMock = vi.fn(async (url: string) => {
    const bytes = objects.get(url.replace("https://storage.test/", ""));
    return bytes ? new Response(bytes) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    root,
    file,
    bytes,
    objects,
    bucket,
    service,
    fetchMock,
    options: {
      supabase,
      supabaseServiceRole: service,
      authenticated: {
        userId,
        claims: [{ organization_id: "workspace", role }],
      },
    },
  };
}
it("streams a single distribution archive in one pass with no local snapshot", async () => {
  const test = await setup();
  let local = "";
  const result = await withTransferArchives(
    { path },
    test.options as any,
    async ({ archives, digest, directory }) => {
      local = directory;
      expect(archives[0]!.path).toBeUndefined();
      expect(await readdir(directory)).toEqual([]);
      expect(digest).toBe(archives[0]!.id);
      return archives[0]!.xrag.xrag_type;
    },
  );
  expect(result).toBe("files");
  expect(test.fetchMock).toHaveBeenCalledTimes(1);
  await expect(access(local)).rejects.toThrow();
  expect(test.options.supabase.auth.getClaims).not.toHaveBeenCalled();
});
it("checks every source owner before accessing privileged Storage", async () => {
  const test = await setup();
  await expect(
    withTransferArchives(
      { path: path.replace(userId, "33333333-3333-4333-8333-333333333333") },
      test.options as any,
      vi.fn(),
    ),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(test.service.storage.from).not.toHaveBeenCalled();
});
it("rejects editors before privileged Storage access", async () => {
  const test = await setup("editor");
  await expect(
    withTransferArchives({ path }, test.options as any, vi.fn()),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(test.service.storage.from).not.toHaveBeenCalled();
});
it("refuses changed archive bytes before invoking an import operation", async () => {
  const test = await setup();
  const operation = vi.fn();
  await expect(
    withTransferArchives(
      { path, digest: "0".repeat(64) },
      test.options as any,
      operation,
    ),
  ).rejects.toThrow("XRAG_CHECKSUM_MISMATCH");
  expect(operation).not.toHaveBeenCalled();
  expect(test.bucket.upload).not.toHaveBeenCalled();
});
it("reads an uploaded collection as unchanged child archives", async () => {
  const test = await setup();
  const collection = join(test.root, "collection.tar");
  await createCollection([test.file], collection);
  test.objects.set(path, await readFile(collection));
  const contents = await withTransferArchives(
    { path },
    test.options as any,
    async ({ archives }) =>
      Promise.all(archives.map((archive) => readFile(archive.path!))),
  );
  expect(contents).toEqual([test.bytes]);
  expect(test.bucket.upload).not.toHaveBeenCalled();
});
it("workspace administrators cannot preview or import distribution contents", async () => {
  const test = await setup();
  const input = { source: { path }, target: { workspaceId: "workspace" } };
  await expect(previewXRAGImport(input, test.options as any)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  const inspected = await inspectArchive(Readable.from([test.bytes]));
  await expect(
    importXRAGTransfer(
      {
        ...input,
        source: { path, digest: inspected.id },
        confirmedRevisions: {},
      },
      test.options as any,
    ),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(test.service.from).toHaveBeenCalledWith("xrag_prepared_uploads");
  expect(test.service.rpc).not.toHaveBeenCalled();
  expect(test.bucket.upload).not.toHaveBeenCalled();
});
it("creates immutable upload tokens only for the verified caller", async () => {
  const test = await setup();
  const upload = await createTransferUpload(test.options as any);
  expect(upload.path.startsWith(`${userId}/`)).toBe(true);
  expect(test.bucket.createSignedUploadUrl).toHaveBeenCalledWith(upload.path, {
    upsert: false,
  });
  expect(
    (await createTransferUpload(test.options as any, upload.path)).path,
  ).toBe(upload.path);
  await expect(
    createTransferUpload(
      test.options as any,
      upload.path.replace(userId, crypto.randomUUID()),
    ),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(test.bucket.createSignedUploadUrl).toHaveBeenCalledTimes(2);
  const denied = await setup("editor");
  await expect(createTransferUpload(denied.options as any)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(denied.bucket.createSignedUploadUrl).not.toHaveBeenCalled();
});
it("sanitizes unavailable downloads before invoking the operation", async () => {
  const test = await setup();
  test.objects.clear();
  const operation = vi.fn();
  await expect(
    withTransferArchives({ path }, test.options as any, operation),
  ).rejects.toThrow("XRAG_TRANSFER_UNAVAILABLE");
  expect(operation).not.toHaveBeenCalled();
});
