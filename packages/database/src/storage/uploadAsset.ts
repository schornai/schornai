import type { SupabaseClient } from "../_shared/_types.ts";
import { createAssetUpload } from "./createAssetUpload.ts";
/** Same authorization contract as createAssetUpload; never accepts an arbitrary path. */
export async function uploadAsset(
  bucket: "user_avatars" | "theme_logos" | "box-action-files",
  ownerId: string,
  fileName: string,
  bytes: Uint8Array,
  mimeType: string,
  options: { supabase: SupabaseClient },
) {
  const ticket = await createAssetUpload(bucket, ownerId, fileName, options);
  const { error } = await options.supabase.storage
    .from(bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, bytes, {
      contentType: mimeType,
    });
  if (error) throw new Error("ASSET_UPLOAD_FAILED");
  return {
    bucket,
    path: ticket.path,
    reference:
      bucket === "user_avatars"
        ? `${bucket}/${ticket.path}`
        : bucket === "theme_logos"
          ? `/api/storage/theme_logos/${ticket.path}`
          : ticket.path,
  };
}
