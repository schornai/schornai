import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { inspectArchive } from "../packages/xrag/src/archive.ts";
import {
  importedOllamaLocation,
  ollamaModelLocation,
} from "../packages/xrag/src/ollamaModelLocation.ts";
import { getModelExportSource } from "../packages/database/src/xrag/getModelExportSource.ts";
import { streamPackageExport } from "../packages/database/src/xrag/streamPackageExport.ts";
import { installedModelDownload } from "../apps/web/lib/xrag/installedModelDownload.ts";
import { query } from "./helpers/supabase.ts";

let root: string;
const whisper = {
  id: "m",
  type: "mlx_whisper_v1",
  identifier: "whisper-small",
  name: "Whisper small",
  description: "Model card",
  config: { fileSystemIdentifier: "old-install-id" },
};
function options(row: object) {
  return {
    authenticated: { userId: "user", claims: "admin" },
    supabase: { from: () => query({ data: row }) },
    supabaseServiceRole: {
      from: vi.fn(() => {
        throw new Error("unexpected catalog lookup");
      }),
    },
  } as any;
}
async function write(path: string, bytes: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}
const weights = () =>
  join(root, "mlx/whisper/models/old-install-id/weights.npz");
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "xrag-installed-test-"));
  vi.stubEnv("SCHORNAI_HOME", root);
  vi.stubEnv("MLX_WHISPER_MODELS", join(root, "mlx/whisper/models"));
  vi.stubEnv("OLLAMA_MODELS", join(root, "ollama/models"));
  await write(weights(), Buffer.alloc(20000, 42));
  await write(join(dirname(weights()), "config.json"), '{"layers":12}');
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

it("exports an installed Whisper as a resumable native tar and as the identical package child", async () => {
  const config = options(whisper);
  const { installed } = await getModelExportSource("m", config);
  const get = (headers?: HeadersInit) =>
    installedModelDownload(
      new Request("https://app.test", { headers }),
      installed!,
      "model.xrag.tar",
    );
  const response = get();
  const bytes = Buffer.from(await response.arrayBuffer());
  const inspection = await inspectArchive(Readable.from([bytes]));
  expect(inspection.xrag).toMatchObject({
    xrag_type: "mlxWhisperModel",
    meta: { identifier: "whisper-small" },
  });
  expect(inspection.size).toBe(installed!.size);
  for (const [range, start, end] of [
    ["bytes=100-4200", 100, 4201],
    ["bytes=-1200", bytes.length - 1200, bytes.length],
    ["bytes=2011-", 2011, bytes.length],
  ] as const) {
    const part = get({ range, "If-Range": response.headers.get("etag")! });
    expect(part.status).toBe(206);
    expect(Buffer.from(await part.arrayBuffer())).toEqual(
      bytes.subarray(start, end),
    );
  }
  const invalid = get({ range: "bytes=-0" });
  expect(invalid.status).toBe(416);
  const stale = get({ range: "bytes=2-3", "If-Range": '"old"' });
  expect(stale.status).toBe(200);
  await stale.body!.cancel();
  const collection = await streamPackageExport(
    [{ kind: "model", id: "m" }],
    (stream) => inspectArchive(stream),
    config,
  );
  expect(collection.xrag).toMatchObject({
    entries: [{ sha256: inspection.id, size: bytes.length }],
  });
  expect(config.supabaseServiceRole.from).not.toHaveBeenCalled();
});
it("stops a pinned archive when an installed weight file is replaced", async () => {
  const { installed } = await getModelExportSource("m", options(whisper));
  await rm(weights());
  await write(weights(), Buffer.alloc(20000, 1));
  await expect(Array.fromAsync(installed!.read())).rejects.toThrow(
    "XRAG_SOURCE_CHANGED",
  );
  expect(
    (await getModelExportSource("m", options(whisper))).installed!.version,
  ).not.toBe(installed!.version);
});
it("rejects symlinks and invalid model paths without exposing unrelated files", async () => {
  await rm(weights());
  await symlink(join(dirname(weights()), "config.json"), weights());
  await expect(getModelExportSource("m", options(whisper))).rejects.toThrow(
    "XRAG_INVALID_MODEL",
  );
  await expect(
    getModelExportSource(
      "m",
      options({ ...whisper, config: { fileSystemIdentifier: "../outside" } }),
    ),
  ).rejects.toThrow();
});

it.each(["ollama_llm_v1", "ollama_embedding_v1"])(
  "includes the manifest and each referenced blob once for %s",
  async (type) => {
    const modelRoot = join(root, "ollama/models");
    const bytes = Buffer.from("model bytes");
    const hash = createHash("sha256").update(bytes).digest("hex");
    const layer = { digest: "sha256:" + hash, size: bytes.length };
    const path = "blobs/sha256-" + hash;
    await write(join(modelRoot, path), bytes);
    const runtime =
      type === "ollama_llm_v1"
        ? "local_registry.schorn.ai/library/gemma4:26b"
        : "nomic-embed-text";
    const location = ollamaModelLocation(runtime);
    await write(
      join(modelRoot, ...location.manifest),
      JSON.stringify({ config: layer, layers: [layer] }),
    );
    const model = {
      id: "m",
      type,
      identifier: "catalog-id",
      name: "Model",
      config: {
        contextSize: 2048,
        featureThinking: true,
        featureTools: false,
        featureVision: false,
        embeddingVectorSize: 768,
        ollamaIdentifier: runtime,
      },
    };
    const source = await getModelExportSource("m", options(model));
    const tar = await inspectArchive(Readable.from(source.installed!.read()));
    expect(tar.entryCount).toBe(3);
    expect(tar.xrag).toMatchObject({
      xrag_type: "ollamaModel",
      meta: { identifier: "catalog-id", type },
    });
    if (tar.xrag.xrag_type !== "ollamaModel")
      throw new Error("expected Ollama archive");
    expect(importedOllamaLocation(tar.xrag)).toEqual({
      identifier: runtime,
      manifest: location.manifest,
    });
    await writeFile(join(modelRoot, path), Buffer.alloc(bytes.length, 9));
    const corrupt = await getModelExportSource("m", options(model));
    await expect(Array.fromAsync(corrupt.installed!.read())).rejects.toThrow(
      "XRAG_CHECKSUM_MISMATCH",
    );
    expect(await readFile(join(modelRoot, path))).toHaveLength(bytes.length);
  },
);
it.each([
  "../name",
  "foo:bar:baz",
  "https://invalid",
  "registry/../name",
  "name:..",
])("rejects an invalid Ollama name %s", (value) => {
  expect(() => ollamaModelLocation(value)).toThrow("XRAG_INVALID_MODEL");
});

it("serves the last weight byte of a 200 GB model by seeking directly to it", async () => {
  const length = 200_000_000_000;
  const handle = await open(weights(), "r+");
  try {
    await handle.write(Buffer.from("XRAG-END"), 0, 8, length - 8);
    const info = await handle.stat();
    expect(info.size).toBe(length);
    expect(info.blocks * 512).toBeLessThan(1024 * 1024);
  } finally {
    await handle.close();
  }
  const { installed } = await getModelExportSource("m", options(whisper));
  expect(installed!.size).toBeGreaterThan(length);
  expect(installed!.size).toBeLessThan(length + 16384);
  const result = installedModelDownload(
    new Request("https://app.test", { headers: { Range: "bytes=-16384" } }),
    installed!,
    "model.tar",
  );
  expect(result.status).toBe(206);
  const tail = Buffer.from(await result.arrayBuffer());
  expect(tail.length).toBe(16384);
  expect(tail.includes(Buffer.from("XRAG-END"))).toBe(true);
});

it("limits read-ahead when a client pauses a 200 GB model download", async () => {
  const chunk = Buffer.alloc(64 * 1024);
  let reads = 0;
  let closed = false;
  const archive = {
    size: 200_000_000_000,
    version: "fixture",
    async *read() {
      try {
        while (reads * chunk.length < this.size) {
          reads++;
          yield chunk;
        }
      } finally {
        closed = true;
      }
    },
  };
  const result = installedModelDownload(
    new Request("http://app.test/"),
    archive,
    "model.tar",
  );
  const reader = result.body!.getReader();
  expect((await reader.read()).value!.length).toBe(chunk.length);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(reads).toBeLessThanOrEqual(5);
  await reader.cancel();
  await vi.waitFor(() => expect(closed).toBe(true));
});
