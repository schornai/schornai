import { constants, createReadStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { c } from "tar";
import {
  extractArchive,
  inspectArchive,
  type ArchiveLimits,
} from "./archive.ts";
import { collectionSchema } from "./schema.ts";

const limits: ArchiveLimits = {
  maxEntries: 1_000_000,
  maxExtractedBytes: 400 * 1024 ** 3,
};

/** Validate every child before returning any import candidates. The destination
 * must be a private empty directory; the caller owns its lifetime. */
export async function unpackCollection(
  file: string,
  destination: string,
  options: { signal?: AbortSignal; limits?: ArchiveLimits } = {},
) {
  const budget = options.limits ?? limits;
  const inspection = await inspectArchive(
    createReadStream(file),
    options.signal,
    budget,
  );
  const manifest = collectionSchema.parse(inspection.xrag);
  await extractArchive(file, destination, inspection.id, options.signal, {
    limits: budget,
  });
  let extractedBytes = inspection.extractedBytes;
  let entryCount = inspection.entryCount;
  const children = [];
  for (const entry of manifest.entries) {
    options.signal?.throwIfAborted();
    const path = join(destination, `${entry.sha256}.xrag.tar`);
    const child = await inspectArchive(createReadStream(path), options.signal, {
      maxExtractedBytes: budget.maxExtractedBytes - extractedBytes,
      maxEntries: budget.maxEntries - entryCount,
    });
    if (child.id !== entry.sha256 || child.size !== entry.size)
      throw new Error("XRAG_CHECKSUM_MISMATCH");
    if (child.xrag.xrag_type === "collection")
      throw new Error("XRAG_NESTED_COLLECTION");
    extractedBytes += child.extractedBytes;
    entryCount += child.entryCount;
    children.push({
      path,
      id: child.id,
      size: child.size,
      xrag: child.xrag,
      extractedBytes: child.extractedBytes,
      entryCount: child.entryCount,
      resourceFiles: child.resourceFiles,
    });
  }
  return children;
}

/** Build a flat tar of unchanged individual XRAG files. Collections supplied as
 * inputs are flattened; identical archives appear only once. Never buffers model
 * payloads in memory. The output path must not already exist. */
export async function createCollection(
  inputs: readonly string[],
  output: string,
  options: { signal?: AbortSignal; limits?: ArchiveLimits } = {},
) {
  if (!inputs.length || inputs.length > 1000)
    throw new Error("XRAG_COLLECTION_INPUT_LIMIT");
  const directory = await mkdtemp(join(tmpdir(), "xrag-collection-"));
  const budget = options.limits ?? limits;
  const entries = new Map<string, { sha256: string; size: number }>();
  let bytes = 0;
  let count = 0;
  try {
    const staging = join(directory, "output");
    await mkdir(staging);
    for (const [index, input] of inputs.entries()) {
      options.signal?.throwIfAborted();
      const inspected = await inspectArchive(
        createReadStream(input),
        options.signal,
        budget,
      );
      const destination = join(directory, String(index));
      let children;
      if (inspected.xrag.xrag_type === "collection") {
        await mkdir(destination);
        children = await unpackCollection(input, destination, options);
      } else children = [{ path: input, ...inspected }];
      for (const child of children) {
        if (entries.has(child.id)) continue;
        bytes += child.size + child.extractedBytes;
        count += child.entryCount + 1;
        if (
          entries.size >= 1000 ||
          bytes > budget.maxExtractedBytes ||
          count > budget.maxEntries
        )
          throw new Error("XRAG_COLLECTION_LIMIT");
        const target = join(staging, `${child.id}.xrag.tar`);
        await copyFile(child.path, target);
        // Source files may change while being copied. Only publish the checked snapshot.
        const snapshot = await inspectArchive(
          createReadStream(target),
          options.signal,
          budget,
        );
        if (snapshot.id !== child.id) throw new Error("XRAG_CHECKSUM_MISMATCH");
        entries.set(child.id, { sha256: child.id, size: child.size });
      }
      await rm(destination, { recursive: true, force: true });
    }
    const manifest = collectionSchema.parse({
      xrag_version: 2,
      xrag_type: "collection",
      entries: [...entries.values()].sort((a, b) =>
        a.sha256.localeCompare(b.sha256),
      ),
    });
    await writeFile(join(staging, "xrag.json"), JSON.stringify(manifest));
    const archive = join(directory, "collection.xrag.tar");
    await c({ cwd: staging, file: archive, portable: true }, [
      "xrag.json",
      ...manifest.entries.map((entry) => `${entry.sha256}.xrag.tar`),
    ]);
    await inspectArchive(createReadStream(archive), options.signal, budget);
    options.signal?.throwIfAborted();
    // COPYFILE_EXCL prevents replacing an existing user export.
    await copyFile(archive, output, constants.COPYFILE_EXCL);
    return manifest;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
