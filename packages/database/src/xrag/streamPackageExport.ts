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
import { getArtifactStream } from "./getArtifactStream.ts";
import { exportResource } from "./exportResource.ts";
import type { XRAGOptions } from "./authentication.ts";
import type { XRAGPackageObject } from "./packageSchema.ts";

/** Worker-only. Models stream from immutable artifacts. Resource snapshots are
 * spooled once to determine their digest; the enclosing package is never spooled.
 * The consumer must finish/cancel the stream before returning. */
export async function streamPackageExport<T>(
  selections: Pick<XRAGPackageObject, "kind" | "id">[],
  consume: (stream: Readable, size: number) => Promise<T>,
  options: XRAGOptions,
  attemptId = crypto.randomUUID(),
) {
  const directory = await mkdtemp(
    join(tmpdir(), `xrag-export-worker-${attemptId}-`),
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
    async function addModel(id: string) {
      if (modelIds.has(id)) return;
      modelIds.add(id);
      const model = await getModelExportSource(id, options);
      if (children.has(model.id)) return;
      reserve(model.size);
      children.set(model.id, {
        path: `${model.id}.xrag.tar`,
        size: model.size,
        open: async function* () {
          const source = await getArtifactStream(model.path, {
            supabase: options.supabaseServiceRole,
            signal: options.signal,
          });
          const hash = createHash("sha256");
          const readable = Readable.fromWeb(
            source as import("node:stream/web").ReadableStream,
            { signal: options.signal },
          );
          for await (const chunk of readable) {
            hash.update(chunk);
            yield chunk;
          }
          if (hash.digest("hex") !== model.id)
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
    return await consume(stream, size);
  } finally {
    stream?.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}
