import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";

/** Server-only. The caller authorizes the catalog object before resolving its
 * private Storage URL for a streaming response. */
export async function getArtifactDownloadUrl(
  path: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase.storage
    .from(XRAG_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) throw new Error("ARTIFACT_UNAVAILABLE");
  return data.signedUrl;
}
