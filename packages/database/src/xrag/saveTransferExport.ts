import { uploadExportStream } from "./uploadExportStream.ts";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { Readable } from "node:stream";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { SupabaseClient } from "../_shared/_types.ts";
import {
  XRAG_TRANSFER_BUCKET,
  XRAG_UPLOAD_CHUNK_BYTES,
} from "./transferSchema.ts";

/** Internal: use only after authorizing all source objects/uploads. userId comes
 * from verified authentication. The source can be streamed directly into Storage. */
export async function saveTransferExport(
  file: string | { stream: Readable; size: number },
  name: string,
  userId: string,
  { supabase, signal }: { supabase: SupabaseClient; signal?: AbortSignal },
) {
  const size = typeof file === "string" ? (await stat(file)).size : file.size;
  if (size === 0) throw new Error("XRAG_EXPORT_FAILED");
  const path = `${userId}/${crypto.randomUUID()}/${name}`;
  const bucket = supabase.storage.from(XRAG_TRANSFER_BUCKET);
  const body = typeof file === "string" ? createReadStream(file) : file.stream;
  try {
    if (size >= XRAG_UPLOAD_CHUNK_BYTES) {
      await uploadExportStream(body, size, path, {
        endpoint: `${getEnvSafe("SUPABASE_URL").replace(/\/$/, "")}/storage/v1/upload/resumable`,
        token: getEnvSafe("SUPABASE_SERVICE_ROLE_KEY"),
        signal: signal ?? new AbortController().signal,
        bucketName: XRAG_TRANSFER_BUCKET,
      });
    } else {
      const stream = Readable.toWeb(
        body,
      ) as unknown as ReadableStream<Uint8Array>;
      const uploaded = await bucket.upload(path, stream, {
        contentType: "application/x-tar",
        upsert: false,
        headers: { "Content-Length": String(size) },
        duplex: "half",
      });
      if (uploaded.error) throw new Error("XRAG_EXPORT_FAILED");
    }
  } catch (error) {
    await bucket.remove([path]);
    throw error;
  } finally {
    body.destroy();
  }
  // A successful HTTP upload is not proof that the transport sent every byte.
  // Never publish a download link for a truncated archive.
  const stored = await bucket.info(path);
  if (stored.error || stored.data?.size !== size) {
    await bucket.remove([path]);
    throw new Error("XRAG_EXPORT_FAILED");
  }
  const signed = await bucket.createSignedUrl(path, 600, { download: name });
  if (signed.error || !signed.data) {
    await bucket.remove([path]);
    throw new Error("XRAG_EXPORT_FAILED");
  }
  return {
    path,
    name,
    url: signed.data.signedUrl,
    size,
  };
}
