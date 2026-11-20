import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { extractArchive } from "xrag/archive";
import { resourceFileManifestSchema } from "xrag/schema";
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
import { withTransferArchives } from "./withTransferArchives.ts";
import { requireXRAGArchiveAccess } from "./requireImportAccess.ts";
import {
  PREPARED_BUCKET,
  preparedEntriesSchema,
  type PreparedArchive,
} from "./preparedUpload.ts";
import { validateRepositoryFiles } from "./validateRepositoryFiles.ts";
import { json } from "./importTransaction.ts";

/** One preparation per upload. Preview/selection subsequently read only inventory.
 * Collections retain individual archives; a single resource retains only its
 * extracted configuration and files. The outer archive is then discarded. */
export async function prepareXRAGTransfer(
  input: { path: string; digest?: string },
  options: XRAGOptions,
) {
  // Leave ample time for a large snapshot while bounding the lifetime of unpublished children.
  const deadline = AbortSignal.timeout(24 * 3600_000);
  options = {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, deadline])
      : deadline,
  };
  const source = transferSourceSchema.parse(input);
  const claims = await getXRAGClaims(options);
  requirePlatformAccess(claims, "admin", "workspace");
  const userId = await getXRAGUserId(options);
  if (source.path.split("/")[0] !== userId) throw new Error("NOT_AUTHORIZED");
  const db = options.supabaseServiceRole;
  const read = () =>
    db
      .from("xrag_prepared_uploads")
      .select("*")
      .eq("source_path", source.path)
      .eq("user_id", userId)
      .maybeSingle();
  const existing = await read();
  if (existing.error) throw new Error("XRAG_TRANSFER_UNAVAILABLE");
  if (
    existing.data &&
    Date.now() - Date.parse(existing.data.created_at) >= 3600_000
  )
    throw new Error("XRAG_TRANSFER_EXPIRED");
  const result =
    existing.data ??
    (await withTransferArchives(
      source,
      options,
      async ({ archives, digest, size, directory }) => {
        requireXRAGArchiveAccess(
          archives.map((a) => a.xrag),
          claims,
        );
        const id = source.path.split("/")[1]!;
        const prefix = `${id}/${crypto.randomUUID()}`;
        const entries: PreparedArchive[] = [];
        const stored: string[] = [];
        const upload = async (
          path: string,
          local: string,
          size: number,
          contentType: string,
        ) => {
          stored.push(path);
          const body = createReadStream(local, { signal: options.signal });
          try {
            const saved = await db.storage
              .from(PREPARED_BUCKET)
              .upload(
                path,
                Readable.toWeb(body) as unknown as ReadableStream<Uint8Array>,
                {
                  contentType,
                  upsert: false,
                  duplex: "half",
                  headers: { "Content-Length": String(size) },
                },
              );
            if (saved.error) throw new Error("XRAG_PREPARATION_FAILED");
            const info = await db.storage.from(PREPARED_BUCKET).info(path);
            if (info.error || info.data?.size !== size)
              throw new Error("XRAG_PREPARATION_FAILED");
          } finally {
            body.destroy();
          }
          return { bucket: PREPARED_BUCKET, path };
        };
        // A single child whose digest differs from the outer digest is still a collection.
        const single = archives.length === 1 && archives[0]!.id === digest;
        let removeAttemptFiles = true;
        try {
          for (const archive of archives) {
            options.signal?.throwIfAborted();
            const entry: PreparedArchive = {
              id: archive.id,
              size: archive.size,
              xrag: archive.xrag,
            };
            if (single && archive.xrag.xrag_type === "resource") {
              const destination = join(directory, "resource");
              await mkdir(destination);
              const extracted = await extractArchive(
                archive.path,
                destination,
                archive.id,
                options.signal,
              );
              const files = validateRepositoryFiles(
                resourceFileManifestSchema.parse(
                  JSON.parse(
                    extracted.metadata.get("files.json")?.toString("utf8") ??
                      "[]",
                  ),
                ),
              );
              entry.files = [];
              for (const [index, file] of files.entries())
                entry.files.push({
                  ...file,
                  source: await upload(
                    `${prefix}/files/${index}`,
                    join(destination, "files", file.path),
                    file.size,
                    file.contentType,
                  ),
                });
            } else if (single) {
              // Models/updates keep their original bytes until artifact publication.
              entry.source = {
                bucket: XRAG_TRANSFER_BUCKET,
                path: source.path,
              };
            } else {
              entry.source = await upload(
                `${prefix}/${archive.id}.xrag.tar`,
                archive.path,
                archive.size,
                "application/x-tar",
              );
            }
            entries.push(entry);
          }
          options.signal?.throwIfAborted();
          // A lost response can arrive before the insert commits. Keep the files
          // until a successful read identifies which prefix won.
          removeAttemptFiles = false;
          await db.from("xrag_prepared_uploads").upsert(
            {
              id,
              user_id: userId,
              source_path: source.path,
              name: source.path.split("/").at(-1)!,
              size,
              digest,
              prefix,
              entries: json(entries)!,
            },
            { onConflict: "source_path", ignoreDuplicates: true },
          );
          const winner = await read();
          if (winner.error || !winner.data)
            throw new Error("XRAG_PREPARATION_UNCERTAIN");
          removeAttemptFiles = winner.data.prefix !== prefix;
          return winner.data;
        } finally {
          if (removeAttemptFiles)
            for (let i = 0; i < stored.length; i += 100) {
              // Failed cleanup is handled by the ordinary 72-hour abandoned-upload sweep.
              await db.storage
                .from(PREPARED_BUCKET)
                .remove(stored.slice(i, i + 100));
            }
        }
      },
    ));
  const entries = preparedEntriesSchema.parse(result.entries);
  if (source.digest && source.digest !== result.digest)
    throw new Error("XRAG_CHECKSUM_MISMATCH");
  requireXRAGArchiveAccess(
    entries.map((a) => a.xrag),
    claims,
  );
  if (
    !entries.some(
      (e) =>
        e.source?.bucket === XRAG_TRANSFER_BUCKET &&
        e.source.path === source.path,
    )
  ) {
    const removed = await db.storage
      .from(XRAG_TRANSFER_BUCKET)
      .remove([source.path]);
    if (removed.error) throw new Error("XRAG_TRANSFER_DELETE_FAILED");
  }
  return { ...result, entries };
}
