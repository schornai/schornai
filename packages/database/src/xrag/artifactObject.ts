import { XRAG_BUCKET } from "./_schema.ts";
import { PREPARED_BUCKET } from "./preparedUpload.ts";
import { XRAG_TRANSFER_BUCKET } from "./transferSchema.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Catalog paths predating in-place imports live in box-action-files.
 * The reserved imported/ namespace records where the verified original lives. */
export function importedArtifactPath(bucket: string, path: string) {
  if (bucket !== XRAG_TRANSFER_BUCKET && bucket !== PREPARED_BUCKET)
    throw new Error("XRAG_INVALID_ARTIFACT_SOURCE");
  return `imported/${bucket}/${path}`;
}

export function artifactObject(reference: string) {
  if (!reference.startsWith("imported/"))
    return { bucket: XRAG_BUCKET, path: reference };
  const [, bucket, ...segments] = reference.split("/");
  const path = segments.join("/");
  if (!bucket || !path || importedArtifactPath(bucket, path) !== reference)
    throw new Error("XRAG_INVALID_ARTIFACT_SOURCE");
  return { bucket, path };
}

/** Only publication cleanup or withdrawal may release the retained original.
 * The catalog reference continues to resolve even if Storage removal needs a retry. */
export async function removeArtifactObject(
  reference: string,
  supabase: SupabaseClient,
) {
  const { bucket, path } = artifactObject(reference);
  if (bucket !== XRAG_BUCKET) {
    const released = await supabase
      .from("artifact_publications")
      .update({ retained_object_id: null })
      .eq("upload_path", reference);
    if (released.error) throw new Error("XRAG_ARTIFACT_RELEASE_FAILED");
  }
  return supabase.storage.from(bucket).remove([path]);
}
