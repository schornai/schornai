import { createWriteStream } from "node:fs";
import { createHash } from "node:crypto";
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
  path?: string;
  id: string;
  size: number;
  xrag: XRAG;
};

/** Validate immutable uploads as streams. Only resources and collections need a local archive for extraction.
 * The callback is never invoked for a partially validated collection. */
export async function withTransferArchives<T>(
  input: { path: string; digest?: string },
  options: XRAGOptions & { queuedAt?: number },
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
  if (
    !(
      Date.parse(info.data.createdAt) >
      (options.queuedAt ?? Date.now()) - 3600_000
    )
  )
    throw new Error("XRAG_TRANSFER_EXPIRED");
  const directory = await mkdtemp(join(tmpdir(), "xrag-transfer-"));
  const archives: TransferArchive[] = [];
  let extracted = 0;
  let entries = 0;
  try {
    options.signal?.throwIfAborted();
    async function* readOriginal() {
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
      let bytes = 0;
      for await (const chunk of Readable.fromWeb(
        response.body as import("node:stream/web").ReadableStream,
      )) {
        bytes += chunk.length;
        if (bytes > 200 * 1024 ** 3) throw new Error("XRAG_ARCHIVE_LIMIT");
        yield chunk as Buffer;
      }
    }
    const inspected = await inspectArchive(readOriginal(), options.signal);
    if (source.digest && source.digest !== inspected.id)
      throw new Error("XRAG_CHECKSUM_MISMATCH");
    let children: (Pick<
      typeof inspected,
      "id" | "size" | "xrag" | "extractedBytes" | "entryCount" | "resourceFiles"
    > & { path?: string })[] = [inspected];
    if (
      inspected.xrag.xrag_type === "collection" ||
      inspected.xrag.xrag_type === "resource"
    ) {
      const file = join(directory, "source.xrag.tar");
      const hash = createHash("sha256");
      const verify = new Transform({
        transform(chunk, _encoding, callback) {
          hash.update(chunk);
          callback(null, chunk);
        },
      });
      await pipeline(
        readOriginal(),
        verify,
        createWriteStream(file, { flags: "wx" }),
        { signal: options.signal },
      );
      if (hash.digest("hex") !== inspected.id)
        throw new Error("XRAG_CHECKSUM_MISMATCH");
      if (inspected.xrag.xrag_type === "collection") {
        const destination = join(directory, "collection");
        await mkdir(destination);
        children = await unpackCollection(file, destination, {
          signal: options.signal,
        });
      } else children = [{ ...inspected, path: file }];
    }
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
