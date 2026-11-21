import type { SupabaseClient } from "../_shared/_types.ts";
import { artifactObject } from "./artifactObject.ts";

/** Server-only. The caller authorizes the catalog object before resolving its
 * private Storage URL for a streaming response. */
export async function getArtifactDownloadUrl(
  path: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const source = artifactObject(path);
  const { data, error } = await supabase.storage
    .from(source.bucket)
    .createSignedUrl(source.path, 3600);
  if (error || !data) throw new Error("ARTIFACT_UNAVAILABLE");
  return data.signedUrl;
}
