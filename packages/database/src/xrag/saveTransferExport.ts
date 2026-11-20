import { Readable } from "node:stream";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_TRANSFER_BUCKET } from "./transferSchema.ts";

/** Internal: use only after authorizing all source objects/uploads. userId comes
 * from verified authentication; file is a private, validated local XRAG snapshot. */
export async function saveTransferExport(
  file: string,
  name: string,
  userId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const size = (await stat(file)).size;
  if (size === 0) throw new Error("XRAG_EXPORT_FAILED");
  const path = `${userId}/${crypto.randomUUID()}/${name}`;
  const bucket = supabase.storage.from(XRAG_TRANSFER_BUCKET);
  // Next.js instruments fetch bodies; pass a Web Stream so the file is
  // forwarded correctly instead of becoming an empty request body.
  const body = createReadStream(file);
  // Node and DOM declare different BYOB reader types for the same Web API.
  const stream = Readable.toWeb(body) as unknown as ReadableStream<Uint8Array>;
  try {
    const uploaded = await bucket.upload(path, stream, {
      contentType: "application/x-tar",
      upsert: false,
      headers: { "Content-Length": String(size) },
      duplex: "half",
    });
    if (uploaded.error) throw new Error("XRAG_EXPORT_FAILED");
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
  if (signed.error || !signed.data) throw new Error("XRAG_EXPORT_FAILED");
  return {
    path,
    name,
    url: signed.data.signedUrl,
    size,
  };
}
