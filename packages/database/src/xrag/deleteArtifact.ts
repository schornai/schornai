import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";
import { getArtifact } from "./getArtifact.ts";

/** Server-only: caller MUST authorize a global admin. Withdrawal serializes with
 * publication on the catalog row. Tombstones survive purge and retries forever.
 */
export async function deleteArtifact(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  await getArtifact(id, { supabase });
  const withdrawn = await supabase
    .from("artifact_catalog")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (withdrawn.error) throw new Error("ARTIFACT_DELETE_FAILED");
  const { data, error } = await supabase
    .from("artifact_catalog")
    .select("object_path")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("ARTIFACT_DELETE_FAILED");
  const removed = await supabase.storage
    .from(XRAG_BUCKET)
    .remove([data.object_path]);
  if (removed.error) throw new Error("ARTIFACT_DELETE_FAILED");
  const purged = await supabase
    .from("artifact_catalog")
    .update({ purged_at: new Date().toISOString() })
    .eq("id", id)
    .is("purged_at", null);
  if (purged.error) throw new Error("ARTIFACT_DELETE_FAILED");
  return getArtifact(id, { supabase });
}
