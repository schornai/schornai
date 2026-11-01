import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";
import { getArtifact } from "./getArtifact.ts";

/** Server-only: caller MUST authorize a global admin. Does not uninstall anything.
 * Mark withdrawn first, then remove bytes. Retrying a partial deletion is safe.
 * Retain the release tombstone to prevent accidental setup downgrades.
 */
export async function deleteArtifact(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const artifact = await getArtifact(id, { supabase });
  const bucket = supabase.storage.from(XRAG_BUCKET);
  const withdrawn = {
    ...artifact,
    deletedAt: artifact.deletedAt ?? new Date().toISOString(),
  };
  const save = async (value: typeof withdrawn) => {
    const { error } = await bucket.upload(
      `catalog/${id}.json`,
      JSON.stringify(value),
      {
        contentType: "application/json",
        upsert: true,
      },
    );
    if (error) throw new Error("ARTIFACT_DELETE_FAILED");
  };
  await save(withdrawn);
  const { error } = await bucket.remove([`artifacts/${id}.tar`]);
  if (error) throw new Error("ARTIFACT_DELETE_FAILED");
  const deleted = { ...withdrawn, purgedAt: new Date().toISOString() };
  await save(deleted);
  return deleted;
}
