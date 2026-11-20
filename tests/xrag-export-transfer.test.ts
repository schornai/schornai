import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { c } from "tar";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { exportXRAG } from "../packages/database/src/xrag/exportXRAG.ts";
import { inspectArchive } from "../packages/xrag/src/archive.ts";
import { unpackCollection } from "../packages/xrag/src/collection.ts";
import { createResourceArchive } from "../packages/xrag/src/resourceArchive.ts";
import { nativeResourceId } from "../packages/xrag/src/identity.ts";
const state = vi.hoisted(() => ({
  resource: vi.fn(),
  model: vi.fn(),
  models: vi.fn(),
}));
vi.mock("../packages/database/src/xrag/exportResource.ts", () => ({
  exportResource: state.resource,
}));
vi.mock("../packages/database/src/xrag/getModelExport.ts", () => ({
  getModelExport: state.model,
}));
vi.mock("../packages/database/src/aiModel/getAIModels.ts", () => ({
  getAIModels: state.models,
}));
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
beforeEach(() => vi.resetAllMocks());
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "xrag-export-transfer-test-"));
  roots.push(root);
  const source = join(root, "source");
  await mkdir(source);
  await writeFile(
    join(source, "xrag.json"),
    JSON.stringify({
      xrag_version: 1,
      xrag_type: "files",
      targets: ["ollama"],
      name: "model-fixture",
    }),
  );
  await writeFile(join(source, "payload"), "model bytes");
  const file = join(root, "model.tar");
  await c({ cwd: source, file }, ["xrag.json", "payload"]);
  const model = await inspectArchive(createReadStream(file));
  const bytes = await readFile(file);
  state.model.mockImplementation(async () => ({
    id: model.id,
    resourceId: nativeResourceId("model", "runtime-model"),
    stream: new Response(bytes).body,
  }));
  state.models.mockResolvedValue([
    { id: "model", identifier: "runtime-model" },
  ]);
  state.resource.mockImplementation(async (_kind, _id, file) => {
    const resource = {
      xrag_version: 2 as const,
      xrag_type: "resource" as const,
      resourceType: "transcriber" as const,
      id: nativeResourceId("transcriber", "transcriber"),
      data: {
        name: "Transcriber",
        version: "transcriber-v2",
        modelIdentifier: "runtime-model",
      },
      references: [
        {
          kind: "model" as const,
          id: nativeResourceId("model", "runtime-model"),
          identifier: "runtime-model",
        },
      ],
    };
    await createResourceArchive(resource, (async function* () {})(), file);
    return { resourceId: resource.id };
  });
  const uploaded = new Map<string, Buffer>();
  const bucket = {
    info: vi.fn(async (path: string) => ({
      data: { size: uploaded.get(path)?.length },
      error: null,
    })),
    remove: vi.fn(async () => ({ error: null })),
    upload: vi.fn(async (path: string, body: AsyncIterable<Buffer>) => {
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(chunk);
      uploaded.set(path, Buffer.concat(chunks));
      return { error: null as unknown };
    }),
    createSignedUrl: vi.fn(async () => ({
      data: { signedUrl: "https://storage.test/download" },
      error: null as unknown,
    })),
  };
  const options = {
    supabase: {},
    supabaseServiceRole: { storage: { from: vi.fn(() => bucket) } },
    authenticated: {
      userId: "11111111-1111-4111-8111-111111111111",
      claims: "admin" as const,
    },
  };
  return { root, file, bytes, model, uploaded, bucket, options };
}
it("exports exactly one resource unless model inclusion is selected", async () => {
  const f = await fixture();
  const result = await exportXRAG(
    { kind: "transcriber", id: "transcriber" },
    f.options as any,
  );
  const archive = await inspectArchive(
    Readable.from([f.uploaded.get(result.path)!]),
  );
  expect(archive.xrag.xrag_type).toBe("resource");
  expect(state.models).not.toHaveBeenCalled();
  expect(state.model).not.toHaveBeenCalled();
  expect(result.name.startsWith("transcriber-")).toBe(true);
});
it("exports an unchanged model archive without bundling", async () => {
  const f = await fixture();
  const result = await exportXRAG(
    { kind: "model", id: "model" },
    f.options as any,
  );
  expect(f.uploaded.get(result.path)).toEqual(f.bytes);
  expect(state.resource).not.toHaveBeenCalled();
});
it("packages referenced models with one resource", async () => {
  const f = await fixture();
  const result = await exportXRAG(
    { kind: "transcriber", id: "transcriber", includeModels: true },
    f.options as any,
  );
  const archive = await inspectArchive(
    Readable.from([f.uploaded.get(result.path)!]),
  );
  expect(archive.xrag).toMatchObject({
    xrag_type: "collection",
    entries: [expect.anything(), expect.anything()],
  });
  expect(state.model).toHaveBeenCalledWith("model", f.options);
});
it("packages a local role model while preserving the agent's external connection as a reference", async () => {
  const f = await fixture();
  const connection = {
    kind: "model" as const,
    id: nativeResourceId("model", "external:agent"),
    identifier: "external:agent",
    externalModel: { provider: "openai", modelId: "agent" },
  };
  state.resource.mockImplementationOnce(async (_kind, _id, output) => {
    await createResourceArchive(
      {
        xrag_version: 2,
        xrag_type: "resource",
        resourceType: "agent",
        id: "agent",
        data: {
          modelIdentifier: connection.identifier,
          roles: [{ modelIdentifierOverride: "runtime-model" }],
        },
        references: [
          connection,
          {
            kind: "model",
            id: nativeResourceId("model", "runtime-model"),
            identifier: "runtime-model",
          },
        ],
      },
      [],
      output,
    );
    return { resourceId: "agent" };
  });
  const result = await exportXRAG(
    { kind: "agent", id: "agent", includeModels: true },
    f.options as any,
  );
  const file = join(f.root, "mixed.xrag.tar");
  const unpacked = join(f.root, "unpacked");
  await writeFile(file, f.uploaded.get(result.path)!);
  await mkdir(unpacked);
  const contents = await unpackCollection(file, unpacked);
  expect(contents).toHaveLength(2);
  expect(
    contents.find((child) => child.xrag.xrag_type === "resource")?.xrag,
  ).toMatchObject({ references: expect.arrayContaining([connection]) });
  expect(state.model).toHaveBeenCalledExactlyOnceWith("model", f.options);
});
it("fails without producing a partial export when referenced model archives are unavailable", async () => {
  const f = await fixture();
  state.models.mockResolvedValue([]);
  await expect(
    exportXRAG(
      { kind: "transcriber", id: "transcriber", includeModels: true },
      f.options as any,
    ),
  ).rejects.toThrow("XRAG_MODEL_ARCHIVE_UNAVAILABLE");
  expect(f.bucket.upload).not.toHaveBeenCalled();
});
it("detects a changed model download before saving an export", async () => {
  const f = await fixture();
  state.model.mockResolvedValue({
    id: "0".repeat(64),
    resourceId: nativeResourceId("model", "runtime-model"),
    stream: new Response(f.bytes).body,
  });
  await expect(
    exportXRAG({ kind: "model", id: "model" }, f.options as any),
  ).rejects.toThrow("XRAG_CHECKSUM_MISMATCH");
  expect(f.bucket.upload).not.toHaveBeenCalled();
});
it("rejects a non-resource returned by the object exporter", async () => {
  const f = await fixture();
  state.resource.mockImplementation(async (_kind, _id, file) => {
    await copyFile(f.file, file);
    return { resourceId: "id" };
  });
  await expect(
    exportXRAG(
      { kind: "transcriber", id: "transcriber", includeModels: true },
      f.options as any,
    ),
  ).rejects.toThrow("XRAG_INVALID_RESOURCE");
  expect(f.bucket.upload).not.toHaveBeenCalled();
});
it.each(["upload", "sign"])("sanitizes %s failures", async (failure) => {
  const f = await fixture();
  if (failure === "upload")
    f.bucket.upload.mockImplementationOnce(async (_path, body) => {
      for await (const _chunk of body) {
      }
      return { error: new Error("private") };
    });
  else
    f.bucket.createSignedUrl.mockResolvedValue({
      data: null as any,
      error: new Error("private"),
    });
  await expect(
    exportXRAG({ kind: "model", id: "model" }, f.options as any),
  ).rejects.toThrow("XRAG_EXPORT_FAILED");
});
