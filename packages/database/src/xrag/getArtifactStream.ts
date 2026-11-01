import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";

/** Server-only; never send this signed Storage URL or credentials to the browser. */
export async function getArtifactStream(
  path: string,
  { supabase, signal }: { supabase: SupabaseClient; signal?: AbortSignal },
) {
  const { data, error } = await supabase.storage
    .from(XRAG_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) throw new Error("ARTIFACT_UNAVAILABLE");
  const response = await fetch(data.signedUrl, { signal, cache: "no-store" });
  if (!response.ok || !response.body) throw new Error("ARTIFACT_UNAVAILABLE");
  return response.body;
}
