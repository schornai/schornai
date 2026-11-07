import type { SupabaseClient } from "../_shared/_types.ts";
/** Caller authorizes bucket/owner. New immutable paths prevent overwriting other assets. */
export async function createAssetUpload(
  bucket: "user_avatars" | "theme_logos" | "box-action-files",
  ownerId: string,
  fileName: string,
  { supabase }: { supabase: SupabaseClient },
) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(fileName))
    throw new Error("INVALID_FILE_NAME");
  const path =
    bucket === "user_avatars"
      ? `${ownerId}/${crypto.randomUUID()}-${fileName}`
      : `uploads/${crypto.randomUUID()}/${fileName}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data) throw new Error("UPLOAD_URL_FAILED");
  return { bucket, path, signedUrl: data.signedUrl, token: data.token };
}
