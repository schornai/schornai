import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inspectArchive } from "xrag/archive";
import { unpackCollection } from "xrag/collection";
import type { XRAG } from "xrag/schema";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import {
  transferSourceSchema,
  XRAG_TRANSFER_BUCKET,
} from "./transferSchema.ts";
import { parseResource } from "./resource.ts";
import { validateRepositoryFiles } from "./validateRepositoryFiles.ts";

type TransferArchive = {
  path: string;
  id: string;
  size: number;
  xrag: XRAG;
};

/** Authorize each owned upload, snapshot it locally and validate every child.
 * The callback is never invoked for a partially validated collection. */
export async function withTransferArchives<T>(
  input: { path: string; digest?: string },
  options: XRAGOptions,
  operation: (input: {
    archives: TransferArchive[];
    digest: string;
    size: number;
    directory: string;
  }) => Promise<T>,
) {
  const claims = await getXRAGClaims(options);
  requirePlatformAccess(claims, "admin", "workspace");
  const userId = await getXRAGUserId(options);
  const source = transferSourceSchema.parse(input);
  if (source.path.split("/")[0] !== userId) throw new Error("NOT_AUTHORIZED");
  const bucket = options.supabaseServiceRole.storage.from(XRAG_TRANSFER_BUCKET);
  const info = await bucket.info(source.path);
  if (info.error || !info.data) throw new Error("XRAG_TRANSFER_UNAVAILABLE");
  if (!(Date.parse(info.data.createdAt) > Date.now() - 3600_000))
    throw new Error("XRAG_TRANSFER_EXPIRED");
  const directory = await mkdtemp(join(tmpdir(), "xrag-transfer-"));
  const archives: TransferArchive[] = [];
  let bytes = 0;
  let extracted = 0;
  let entries = 0;
  try {
    options.signal?.throwIfAborted();
    const signed = await bucket.createSignedUrl(source.path, 3600);
    if (signed.error || !signed.data)
      throw new Error("XRAG_TRANSFER_UNAVAILABLE");
    const response = await fetch(signed.data.signedUrl, {
      signal: options.signal,
      cache: "no-store",
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => {});
      throw new Error("XRAG_TRANSFER_UNAVAILABLE");
    }
    const file = join(directory, "source.xrag.tar");
    const bound = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        bytes += chunk.length;
        callback(
          bytes > 200 * 1024 ** 3 ? new Error("XRAG_ARCHIVE_LIMIT") : null,
          chunk,
        );
      },
    });
    await pipeline(
      Readable.fromWeb(
        response.body as import("node:stream/web").ReadableStream,
      ),
      bound,
      createWriteStream(file, { flags: "wx" }),
      { signal: options.signal },
    );
    const inspected = await inspectArchive(
      createReadStream(file),
      options.signal,
    );
    if (source.digest && source.digest !== inspected.id)
      throw new Error("XRAG_CHECKSUM_MISMATCH");
    let children;
    if (inspected.xrag.xrag_type === "collection") {
      const destination = join(directory, "collection");
      await mkdir(destination);
      children = await unpackCollection(file, destination, {
        signal: options.signal,
      });
    } else children = [{ path: file, ...inspected }];
    for (const child of children) {
      if (child.xrag.xrag_type === "resource") {
        parseResource(child.xrag);
        validateRepositoryFiles(child.resourceFiles);
      }
      extracted += child.extractedBytes;
      entries += child.entryCount;
      if (
        extracted > 400 * 1024 ** 3 ||
        entries > 1_000_000 ||
        archives.length >= 1000
      )
        throw new Error("XRAG_IMPORT_ENTRY_LIMIT");
      archives.push({
        path: child.path,
        id: child.id,
        size: child.size,
        xrag: child.xrag,
      });
    }
    return await operation({
      archives,
      digest: inspected.id,
      size: inspected.size,
      directory,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
