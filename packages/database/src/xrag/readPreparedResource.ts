import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { extractArchive } from "xrag/archive";
import { resourceFileManifestSchema } from "xrag/schema";
import type { z } from "zod";
import type { PreparedArchive } from "./preparedUpload.ts";
import type { XRAGOptions } from "./authentication.ts";
import { validateRepositoryFiles } from "./validateRepositoryFiles.ts";
export type ImportDocumentFile = z.infer<
  typeof resourceFileManifestSchema
>[number] & {
  source?: { bucket: string; path: string };
  localPath?: string;
};

/** Only selected children are downloaded/extracted. A single-resource upload is
 * already extracted, so its files can be copied directly into their destination. */
export async function readPreparedResource(
  archive: PreparedArchive,
  directory: string,
  options: XRAGOptions,
): Promise<ImportDocumentFile[]> {
  if (archive.files) return archive.files;
  if (!archive.source) throw new Error("XRAG_TRANSFER_UNAVAILABLE");
  const signed = await options.supabaseServiceRole.storage
    .from(archive.source.bucket)
    .createSignedUrl(archive.source.path, 3600);
  if (signed.error || !signed.data)
    throw new Error("XRAG_TRANSFER_UNAVAILABLE");
  const response = await fetch(signed.data.signedUrl, {
    signal: options.signal,
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("XRAG_TRANSFER_UNAVAILABLE");
  }
  const local = join(directory, `${archive.id}.tar`);
  const destination = join(directory, archive.id);
  let bytes = 0;
  const bound = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      callback(
        bytes > archive.size ? new Error("XRAG_ARCHIVE_LIMIT") : null,
        chunk,
      );
    },
  });
  await pipeline(
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
    bound,
    createWriteStream(local, { flags: "wx" }),
    { signal: options.signal },
  );
  if (bytes !== archive.size) throw new Error("XRAG_CHECKSUM_MISMATCH");
  await mkdir(destination);
  const extracted = await extractArchive(
    local,
    destination,
    archive.id,
    options.signal,
  );
  await rm(local);
  const files = validateRepositoryFiles(
    resourceFileManifestSchema.parse(
      JSON.parse(
        extracted.metadata.get("files.json")?.toString("utf8") ?? "[]",
      ),
    ),
  );
  return files.map((file) => ({
    ...file,
    localPath: join(destination, "files", file.path),
  }));
}
