import type { SupabaseClient } from "../_shared/_types.ts";
import { artifactSchema, XRAG_BUCKET } from "./_schema.ts";

/** Server-only: caller authorizes a global admin or the service sharing token. */
export async function getArtifact(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("INVALID_ARTIFACT_ID");
  const { data, error } = await supabase.storage
    .from(XRAG_BUCKET)
    .download(`catalog/${id}.json`);
  if (error || !data || data.size > 256_000)
    throw new Error("ARTIFACT_NOT_FOUND");
  const artifact = artifactSchema.parse(JSON.parse(await data.text()));
  if (artifact.id !== id) throw new Error("INVALID_ARTIFACT");
  return artifact;
}
