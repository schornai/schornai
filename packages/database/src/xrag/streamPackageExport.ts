import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import {
  archiveSize,
  jsonArchiveEntry,
  streamArchive,
  type ArchiveEntry,
} from "xrag/streamArchive";
import { collectionSchema } from "xrag/schema";
import { getModelExportSource } from "./getModelExportSource.ts";
import { openModelExport } from "./getModelExport.ts";
import { exportResource } from "./exportResource.ts";
import type { XRAGOptions } from "./authentication.ts";
import { getReferencedXRAGModelIds } from "./getReferencedXRAGModelIds.ts";
import type { XRAGSelection } from "./packageSchema.ts";

/** Models stream from their installed files or a published artifact. Resource snapshots are
 * spooled once to determine their digest; the enclosing package is never spooled.
 * The consumer must finish/cancel the stream before returning. */
export async function streamPackageExport<T>(
  selection: XRAGSelection[] | XRAGSelection,
  consume: (stream: Readable, size: number, resourceId: string) => Promise<T>,
  options: XRAGOptions,
  attemptId?: string,
) {
  // Saved packages always have an outer collection, even with only one item.
  // A single-object export keeps its native format unless dependencies are included.
  const single = !Array.isArray(selection);
  const selections = single ? [selection] : selection;
  let resourceId = "";
  const directory = await mkdtemp(
    join(
      tmpdir(),
      attemptId ? `xrag-export-worker-${attemptId}-` : "xrag-export-",
    ),
  );
  const children = new Map<string, ArchiveEntry>();
  let childBytes = 0;
  function reserve(size: number) {
    childBytes += size;
    if (childBytes > 200 * 1024 ** 3) throw new Error("XRAG_COLLECTION_LIMIT");
  }
  const modelIds = new Set<string>();
  let stream: Readable | undefined;
  try {
    async function addModel(modelId: string) {
      if (modelIds.has(modelId)) return;
      modelIds.add(modelId);
      const model = await getModelExportSource(modelId, options);
      if (single && selection.kind === "model") resourceId = model.resourceId;
      if (model.id && children.has(model.id)) return;
      reserve(model.size);
      const openModel = async function* () {
        const stream = await openModelExport(model, options);
        yield* Readable.fromWeb(
          stream as import("node:stream/web").ReadableStream,
          { signal: options.signal },
        );
      };
      // The collection header precedes every child. Hash an installed model in
      // a bounded first pass, then stream the same snapshot directly to upload.
      let id = model.id;
      if (!id && single && selection.kind === "model") {
        // A native single archive needs no enclosing manifest or checksum pass.
        children.set(modelId, {
          path: "model.xrag.tar",
          size: model.size,
          open: openModel,
        });
        return;
      }
      if (!id) {
        const hash = createHash("sha256");
        for await (const chunk of openModel()) hash.update(chunk);
        id = hash.digest("hex");
      }
      if (children.has(id)) {
        childBytes -= model.size;
        return;
      }
      children.set(id, {
        path: `${id}.xrag.tar`,
        size: model.size,
        open: async function* () {
          const hash = createHash("sha256");
          for await (const chunk of openModel()) {
            hash.update(chunk);
            yield chunk;
          }
          if (hash.digest("hex") !== id)
            throw new Error("XRAG_CHECKSUM_MISMATCH");
        },
      });
    }
    for (const [index, selection] of selections.entries()) {
      options.signal?.throwIfAborted();
      if (selection.kind === "model") {
        await addModel(selection.id);
        continue;
      }
      const path = join(directory, `${index}.xrag.tar`);
      const result = await exportResource(
        selection.kind,
        selection.id,
        path,
        options,
      );
      if (single) resourceId = result.resourceId;
      if (children.has(result.id)) {
        await rm(path);
        continue;
      }
      reserve(result.size);
      children.set(result.id, {
        path: `${result.id}.xrag.tar`,
        size: result.size,
        open: () => createReadStream(path),
      });
      if (selection.includeModels) {
        for (const modelId of await getReferencedXRAGModelIds(path, options))
          await addModel(modelId);
      }
    }
    if (single && children.size === 1) {
      const entry = children.values().next().value!;
      stream = Readable.from(entry.open(), {
        objectMode: false,
        signal: options.signal,
      });
      return await consume(stream, entry.size, resourceId);
    }
    const manifest = collectionSchema.parse({
      xrag_version: 2,
      xrag_type: "collection",
      entries: [...children]
        .map(([sha256, entry]) => ({ sha256, size: entry.size }))
        .sort((a, b) => a.sha256.localeCompare(b.sha256)),
    });
    const entries = [
      jsonArchiveEntry("xrag.json", manifest),
      ...manifest.entries.map((e) => children.get(e.sha256)!),
    ];
    const size = archiveSize(entries);
    // The import budget counts both the outer archives and their contents.
    if (size > 200 * 1024 ** 3) throw new Error("XRAG_COLLECTION_LIMIT");
    stream = Readable.from(streamArchive(entries, options.signal), {
      objectMode: false,
      highWaterMark: 64 * 1024,
      signal: options.signal,
    });
    return await consume(stream, size, resourceId);
  } finally {
    stream?.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}
