import { beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { writeFile } from "node:fs/promises";
import { streamPackageExport } from "../packages/database/src/xrag/streamPackageExport.ts";
import { inspectArchive } from "../packages/xrag/src/archive.ts";
const state = vi.hoisted(() => ({
  model: vi.fn(),
  stream: vi.fn(),
  resource: vi.fn(),
}));
vi.mock("../packages/database/src/xrag/getModelExportSource.ts", () => ({
  getModelExportSource: state.model,
}));
vi.mock("../packages/database/src/xrag/getArtifactStream.ts", () => ({
  getArtifactStream: state.stream,
}));
vi.mock("../packages/database/src/xrag/exportResource.ts", () => ({
  exportResource: state.resource,
}));
beforeEach(() => vi.resetAllMocks());
it("streams models lazily, deduplicates digests and never stages their payload", async () => {
  const bytes = Buffer.alloc(10000, 1);
  const id = createHash("sha256").update(bytes).digest("hex");
  state.model.mockResolvedValue({
    id,
    size: bytes.length,
    path: "original/model",
  });
  state.stream.mockImplementation(async () => new Response(bytes).body);
  const result = await streamPackageExport(
    [
      { kind: "model", id: "one" },
      { kind: "model", id: "one" },
      { kind: "model", id: "two" },
    ],
    async (stream, size) => {
      expect(state.stream).not.toHaveBeenCalled();
      const archive = await inspectArchive(stream);
      expect(archive.size).toBe(size);
      return archive;
    },
    {} as any,
  );
  expect(result.xrag).toMatchObject({
    xrag_type: "collection",
    entries: [{ sha256: id, size: bytes.length }],
  });
  expect(state.stream).toHaveBeenCalledTimes(1);
  expect(state.model).toHaveBeenCalledTimes(2);
  expect(state.resource).not.toHaveBeenCalled();
});

it.each([200 * 1024 ** 3 + 1, 200 * 1024 ** 3])(
  "rejects an oversized collection including its tar headers before any payload transfer (%i bytes)",
  async (size) => {
    state.model.mockResolvedValue({
      id: "a".repeat(64),
      path: "private/model",
      size,
    });
    const consume = vi.fn();
    await expect(
      streamPackageExport([{ kind: "model", id: "model" }], consume, {} as any),
    ).rejects.toThrow("XRAG_COLLECTION_LIMIT");
    expect(consume).not.toHaveBeenCalled();
    expect(state.stream).not.toHaveBeenCalled();
  },
);
it("rejects corrupt model bytes before completing the enclosing upload", async () => {
  state.model.mockResolvedValue({
    id: "a".repeat(64),
    size: 1,
    path: "original/model",
  });
  state.stream.mockResolvedValue(new Response("x").body);
  await expect(
    streamPackageExport(
      [{ kind: "model", id: "one" }],
      async (stream) => {
        for await (const _ of stream) {
        }
      },
      {} as any,
    ),
  ).rejects.toThrow("XRAG_CHECKSUM_MISMATCH");
});
it("includes resource snapshots unchanged and cleans them after consumption", async () => {
  const bytes = Buffer.from("resource");
  const id = createHash("sha256").update(bytes).digest("hex");
  let path = "";
  state.resource.mockImplementation(async (_kind, _id, output) => {
    path = output;
    await writeFile(output, bytes);
    return { id, size: bytes.length };
  });
  await streamPackageExport(
    [{ kind: "agent", id: "one" }],
    async (stream) => {
      expect((await inspectArchive(stream)).xrag).toMatchObject({
        xrag_type: "collection",
      });
    },
    {} as any,
  );
  await expect(
    import("node:fs/promises").then((fs) => fs.stat(path)),
  ).rejects.toMatchObject({ code: "ENOENT" });
});
