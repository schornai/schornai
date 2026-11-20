import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { XRAG_TRANSFER_BUCKET } from "./transferSchema.ts";

/** Authorize the owner before minting an immutable, single-path upload token. */
export async function createTransferUpload(options: XRAGOptions) {
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const userId = await getXRAGUserId(options);
  const path = `${userId}/${crypto.randomUUID()}/upload.xrag.tar`;
  const { data, error } = await options.supabaseServiceRole.storage
    .from(XRAG_TRANSFER_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data) throw new Error("XRAG_UPLOAD_FAILED");
  return { path, url: data.signedUrl, token: data.token };
}
