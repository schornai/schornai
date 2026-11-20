import { Header, Pax } from "tar";
import { archivePath } from "./archive.ts";

export type ArchiveEntry = {
  path: string;
  size: number;
  open: () => AsyncIterable<Uint8Array>;
};
const padding = (size: number) => (512 - (size % 512)) % 512;
function header(entry: Pick<ArchiveEntry, "path" | "size">) {
  archivePath(entry.path);
  if (!Number.isSafeInteger(entry.size) || entry.size < 0)
    throw new Error("XRAG_INVALID_SIZE");
  const data = {
    path: entry.path,
    size: entry.size,
    mode: 0o644,
    uid: 0,
    gid: 0,
    mtime: new Date(0),
    type: "File" as const,
  };
  const h = new Header(data);
  h.encode();
  return h.needPax
    ? Buffer.concat([new Pax(data).encode(), h.block!])
    : h.block!;
}

/** Portable deterministic tar; file payloads are pulled only on demand. */
export async function* streamArchive(
  entries: AsyncIterable<ArchiveEntry> | Iterable<ArchiveEntry>,
  signal?: AbortSignal,
) {
  for await (const entry of entries) {
    signal?.throwIfAborted();
    yield header(entry);
    let read = 0;
    for await (const bytes of entry.open()) {
      signal?.throwIfAborted();
      read += bytes.byteLength;
      if (read > entry.size) throw new Error("XRAG_SOURCE_CHANGED");
      yield bytes;
    }
    if (read !== entry.size) throw new Error("XRAG_SOURCE_CHANGED");
    if (padding(read)) yield Buffer.alloc(padding(read));
  }
  yield Buffer.alloc(1024);
}

export function archiveSize(
  entries: readonly Pick<ArchiveEntry, "path" | "size">[],
) {
  const size = entries.reduce(
    (n, entry) => n + header(entry).length + entry.size + padding(entry.size),
    1024,
  );
  if (!Number.isSafeInteger(size)) throw new Error("XRAG_INVALID_SIZE");
  return size;
}

export function jsonArchiveEntry(path: string, value: unknown): ArchiveEntry {
  const bytes = Buffer.from(JSON.stringify(value));
  return {
    path,
    size: bytes.length,
    open: async function* () {
      yield bytes;
    },
  };
}
