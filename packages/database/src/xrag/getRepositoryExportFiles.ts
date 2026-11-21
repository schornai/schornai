import { Readable } from "node:stream";
import { archivePath } from "xrag/archive";
import type { ResourceFile } from "xrag/resourceArchive";
import type { XRAGOptions } from "./authentication.ts";
import { fetchXRAGDownload } from "./fetchXRAGDownload.ts";
import { StorageSession } from "../storage/_utils/StorageSession.ts";
import { listStorageRows } from "../storage/_utils/listStorageRows.ts";
import { TEXT_WRITE_FILE_EXTENSION } from "../storage/_utils/toStorageObjectArray.ts";

export async function* getRepositoryExportFiles(
  id: string,
  workspaceId: string,
  options: XRAGOptions,
): AsyncGenerator<ResourceFile> {
  const session = new StorageSession({
    storage: {
      type: "documentRepository",
      documentRepositoryId: id,
      workspaceId,
    },
    supabaseStorage: options.supabase.storage,
    abortSignal: options.signal,
  });
  const folders = [""];
  let entries = 0;
  while (folders.length) {
    options.signal?.throwIfAborted();
    const folder = folders.pop()!;
    const { storagePath } = session.getStoragePath(folder);
    const rows = await listStorageRows(storagePath, session);
    if (rows.some((row) => row.name.endsWith(TEXT_WRITE_FILE_EXTENSION)))
      throw new Error("XRAG_REPOSITORY_WRITE_PENDING");
    for (const row of rows) {
      if (++entries > 100_000) throw new Error("XRAG_ENTRY_LIMIT");
      if (
        row.name.includes("/") ||
        archivePath(row.name) !== row.name ||
        row.name === "."
      )
        throw new Error("XRAG_UNSAFE_PATH");
      const path = folder ? `${folder}/${row.name}` : row.name;
      if (!row.metadata) {
        folders.push(path);
        continue;
      }
      const signed = await session.supabaseStorage.createSignedUrl(
        session.getStoragePath(path).storagePath,
        3600,
      );
      if (signed.error || !signed.data)
        throw new Error("XRAG_FILE_UNAVAILABLE");
      const response = await fetchXRAGDownload(signed.data.signedUrl, {
        signal: options.signal,
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel().catch(() => {});
        throw new Error("XRAG_FILE_UNAVAILABLE");
      }
      const content = Readable.fromWeb(
        response.body as import("node:stream/web").ReadableStream,
        { signal: options.signal },
      );
      const size = row.metadata.size ?? response.headers.get("content-length");
      try {
        yield {
          path,
          size: size == null ? undefined : Number(size),
          content,
          contentType: row.metadata.mimetype || "application/octet-stream",
        };
      } finally {
        content.destroy();
      }
    }
  }
}
