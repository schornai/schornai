import { createReadStream, createWriteStream } from "node:fs";
import { link, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import {
  streamArchive,
  jsonArchiveEntry,
  type ArchiveEntry,
} from "./streamArchive.ts";
import { archivePath, inspectArchive, type ArchiveLimits } from "./archive.ts";
import {
  resourceFileManifestSchema,
  resourceSchema,
  type XRAGResource,
} from "./schema.ts";

export type ResourceFile = {
  path: string;
  content: AsyncIterable<Uint8Array>;
  contentType?: string;
  size?: number;
};
type Files = AsyncIterable<ResourceFile> | Iterable<ResourceFile>;
type Options = { signal?: AbortSignal; limits?: ArchiveLimits };
const maxArchiveBytes = 200 * 1024 ** 3;
const defaultLimits = {
  maxExtractedBytes: maxArchiveBytes,
  maxEntries: 100_000,
};

/** One TAR format for direct browser downloads and immutable worker snapshots.
 * Storage files supply their lengths; only a source of unknown length needs a spool. */
export async function* streamResourceArchive(
  resource: XRAGResource,
  files: Files,
  { signal, limits = defaultLimits }: Options = {},
) {
  const metadata = resourceSchema.parse(resource);
  const manifest: { path: string; contentType: string; size: number }[] = [];
  const names = new Set<string>();
  let directory: string | undefined;
  let extracted = 0;
  let count = 0;
  function checked(entry: ArchiveEntry) {
    extracted += entry.size;
    if (extracted > limits.maxExtractedBytes)
      throw new Error("XRAG_EXTRACTED_LIMIT");
    if (++count > limits.maxEntries) throw new Error("XRAG_ENTRY_LIMIT");
    return entry;
  }
  async function* entries(): AsyncGenerator<ArchiveEntry> {
    const description = jsonArchiveEntry("xrag.json", metadata);
    if (description.size > 256_000) throw new Error("XRAG_INVALID_METADATA");
    yield checked(description);
    for await (const file of files) {
      signal?.throwIfAborted();
      const path = archivePath(file.path);
      if (
        metadata.resourceType !== "documentRepository" ||
        path === "." ||
        names.has(path)
      )
        throw new Error("XRAG_INVALID_RESOURCE_PAYLOAD");
      names.add(path);
      let size = file.size;
      let temporary: string | undefined;
      if (size === undefined) {
        directory ??= await mkdtemp(join(tmpdir(), "xrag-resource-file-"));
        temporary = join(directory, "unknown-size");
        size = 0;
        async function* bounded() {
          for await (const chunk of file.content) {
            size! += chunk.byteLength;
            if (extracted + size! > limits.maxExtractedBytes)
              throw new Error("XRAG_EXTRACTED_LIMIT");
            yield chunk;
          }
        }
        await pipeline(
          bounded(),
          createWriteStream(temporary, { flags: "wx" }),
          { signal },
        );
      }
      const item = resourceFileManifestSchema.element.parse({
        path,
        size,
        contentType: file.contentType || "application/octet-stream",
      });
      yield checked({
        path: `files/${path}`,
        size,
        open: () =>
          temporary
            ? createReadStream(/* turbopackIgnore: true */ temporary)
            : file.content,
      });
      if (temporary) await rm(temporary);
      manifest.push(item);
    }
    if (manifest.length) {
      const inventory = jsonArchiveEntry("files.json", manifest);
      if (inventory.size > 16_000_000) throw new Error("XRAG_INVALID_METADATA");
      yield checked(inventory);
    }
  }
  try {
    let bytes = 0;
    for await (const chunk of streamArchive(entries(), signal)) {
      bytes += chunk.byteLength;
      if (bytes > maxArchiveBytes) throw new Error("XRAG_ARCHIVE_LIMIT");
      yield chunk;
    }
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

/** Publish a validated snapshot without replacing a previous file. */
export async function createResourceArchive(
  resource: XRAGResource,
  files: Files,
  output: string,
  options: Options = {},
) {
  const idleController = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, idleController.signal])
    : idleController.signal;
  let idle: ReturnType<typeof setTimeout> | undefined;
  const touch = () => {
    clearTimeout(idle);
    idle = setTimeout(
      () => idleController.abort(new Error("XRAG_STREAM_IDLE")),
      120_000,
    );
  };
  const directory = await mkdtemp(join(dirname(output), ".xrag-resource-"));
  const archive = join(directory, "resource.xrag.tar");
  try {
    async function* monitored() {
      for await (const chunk of streamResourceArchive(resource, files, {
        ...options,
        signal,
      })) {
        touch();
        yield chunk;
      }
    }
    touch();
    await pipeline(monitored(), createWriteStream(archive, { flags: "wx" }), {
      signal,
    });
    clearTimeout(idle);
    const inspected = await inspectArchive(
      createReadStream(archive),
      options.signal,
      options.limits ?? defaultLimits,
    );
    await link(archive, output);
    return { id: inspected.id, size: inspected.size };
  } finally {
    clearTimeout(idle);
    await rm(directory, { recursive: true, force: true });
  }
}
