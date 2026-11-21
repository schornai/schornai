import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { c } from "tar";
import { afterEach, expect, it } from "vitest";
import {
  createCollection,
  unpackCollection,
} from "../packages/xrag/src/collection.ts";
import { inspectArchive } from "../packages/xrag/src/archive.ts";
import { artifactTargets, xragSchema } from "../packages/xrag/src/schema.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "xrag-collection-test-"));
  directories.push(root);
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
  await writeFile(join(source, "payload.txt"), "unchanged payload");
  const single = join(root, "single.xrag.tar");
  await c({ cwd: source, file: single }, ["xrag.json", "payload.txt"]);
  return { root, single };
}

it("applies an aggregate extraction budget to collection contents", async () => {
  const { root, single } = await fixture();
  const archive = join(root, "collection.tar");
  await createCollection([single], archive);
  const outer = await inspectArchive(createReadStream(archive));
  const destination = join(root, "unpacked");
  await mkdir(destination);
  await expect(
    unpackCollection(archive, destination, {
      limits: { maxEntries: 100, maxExtractedBytes: outer.extractedBytes },
    }),
  ).rejects.toThrow("XRAG_EXTRACTED_LIMIT");
});

it("rejects nested collections even when their checksums are valid", async () => {
  const { root, single } = await fixture();
  const inner = join(root, "inner.tar");
  await createCollection([single], inner);
  const child = await inspectArchive(createReadStream(inner));
  const source = join(root, "nested");
  await mkdir(source);
  await writeFile(join(source, `${child.id}.xrag.tar`), await readFile(inner));
  await writeFile(
    join(source, "xrag.json"),
    JSON.stringify({
      xrag_version: 2,
      xrag_type: "collection",
      entries: [{ sha256: child.id, size: child.size }],
    }),
  );
  const outer = join(root, "outer.tar");
  await c({ cwd: source, file: outer }, ["."]);
  const destination = join(root, "unpacked");
  await mkdir(destination);
  await expect(unpackCollection(outer, destination)).rejects.toThrow(
    "XRAG_NESTED_COLLECTION",
  );
});

it("honors cancellation before producing an export", async () => {
  const { root, single } = await fixture();
  const output = join(root, "cancelled.tar");
  await expect(
    createCollection([single], output, {
      signal: AbortSignal.abort(new Error("cancelled")),
    }),
  ).rejects.toThrow("cancelled");
  await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
});

it("round-trips unchanged XRAGs and flattens collections with deduplication", async () => {
  const { root, single } = await fixture();
  const first = join(root, "first.xrag.tar");
  await createCollection([single], first);
  const second = join(root, "second.xrag.tar");
  const manifest = await createCollection([first, single], second);
  expect(manifest.entries).toHaveLength(1);
  expect(artifactTargets(manifest)).toEqual([]);
  const destination = join(root, "unpacked");
  await mkdir(destination);
  const children = await unpackCollection(second, destination);
  expect(children).toHaveLength(1);
  expect(await readFile(children[0]!.path)).toEqual(await readFile(single));
});

it("preserves existing exports and rejects empty input", async () => {
  const { single } = await fixture();
  const bytes = await readFile(single);
  await expect(createCollection([single], single)).rejects.toMatchObject({
    code: "EEXIST",
  });
  expect(await readFile(single)).toEqual(bytes);
  await expect(createCollection([], single)).rejects.toThrow("INPUT_LIMIT");
});

it("validates child checksums before returning import candidates", async () => {
  const { root, single } = await fixture();
  const source = join(root, "tampered");
  await mkdir(source);
  const bytes = await readFile(single);
  const sha256 = "a".repeat(64);
  await writeFile(join(source, `${sha256}.xrag.tar`), bytes);
  await writeFile(
    join(source, "xrag.json"),
    JSON.stringify({
      xrag_version: 2,
      xrag_type: "collection",
      entries: [{ sha256, size: bytes.length }],
    }),
  );
  const archive = join(root, "tampered.xrag.tar");
  await c({ cwd: source, file: archive }, ["xrag.json", `${sha256}.xrag.tar`]);
  const destination = join(root, "unpacked");
  await mkdir(destination);
  await expect(unpackCollection(archive, destination)).rejects.toThrow(
    "CHECKSUM_MISMATCH",
  );
});

it("rejects unlisted collection payloads", async () => {
  const { root, single } = await fixture();
  const metadata = await inspectArchive(createReadStream(single));
  const source = join(root, "invalid");
  await mkdir(source);
  await writeFile(
    join(source, "xrag.json"),
    JSON.stringify({
      xrag_version: 2,
      xrag_type: "collection",
      entries: [{ sha256: metadata.id, size: metadata.size }],
    }),
  );
  await writeFile(
    join(source, `${metadata.id}.xrag.tar`),
    await readFile(single),
  );
  await writeFile(join(source, "unexpected"), "extra");
  const archive = join(root, "invalid.tar");
  await c({ cwd: source, file: archive }, ["."]);
  await expect(inspectArchive(createReadStream(archive))).rejects.toThrow(
    "INVALID_COLLECTION",
  );
});

it.each(["site_url", "certificate"])("rejects removed %s packages", (type) => {
  expect(
    xragSchema.safeParse({
      xrag_version: 1,
      xrag_type: type,
      siteUrl: "https://example.com",
    }).success,
  ).toBe(false);
  expect(artifactTargets({ xrag_version: 1, xrag_type: type })).toEqual([]);
});
