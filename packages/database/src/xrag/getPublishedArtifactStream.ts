import type { SupabaseClient } from "../_shared/_types.ts";
import { getArtifactStream } from "./getArtifactStream.ts";

/** Server-only: caller authenticates the sharing token or global admin. Resolves
 * the immutable object privately; the browser/catalog never receives its path.
 */
export async function getPublishedArtifactStream(
  id: string,
  options: {
    supabase: SupabaseClient;
    signal?: AbortSignal;
    range?: { start: number; end: number; size: number };
  },
) {
  const { data, error } = await options.supabase
    .from("artifact_catalog")
    .select("object_path,deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data || data.deleted_at)
    throw new Error("ARTIFACT_UNAVAILABLE");
  return getArtifactStream(data.object_path, options);
}
