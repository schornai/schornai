import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";
import { deleteArtifact } from "./deleteArtifact.ts";
import { listAllArtifacts } from "./listAllArtifacts.ts";
import { currentSetupIds } from "xrag/setup";

/** Trusted worker cleanup. Retry failed removals; never purge an adopted live
 * object, nor anything whose publication is still queued/processing.
 */
export async function cleanupArtifactPublications({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const expired = await supabase.rpc("expire_artifact_uploads");
  if (expired.error) throw new Error("ARTIFACT_CLEANUP_FAILED");
  const { data: jobs, error } = await supabase
    .from("artifact_publications")
    .select("id,upload_path,artifact_id,state")
    .in("state", ["published", "error"])
    .is("cleaned_at", null)
    .order("updated_at")
    .limit(100);
  if (error || !jobs) throw new Error("ARTIFACT_CLEANUP_FAILED");
  for (const job of jobs) {
    const { data: adopted, error } = await supabase
      .from("artifact_catalog")
      .select("id,deleted_at")
      .eq("object_path", job.upload_path)
      .maybeSingle();
    if (error) throw new Error("ARTIFACT_CLEANUP_FAILED");
    if (adopted?.deleted_at) await deleteArtifact(adopted.id, { supabase });
    if (!adopted) {
      const removed = await supabase.storage
        .from(XRAG_BUCKET)
        .remove([job.upload_path]);
      if (removed.error) throw new Error("ARTIFACT_CLEANUP_FAILED");
    }
    const saved = await supabase
      .from("artifact_publications")
      .update({ cleaned_at: new Date().toISOString() })
      .eq("id", job.id);
    if (saved.error) throw new Error("ARTIFACT_CLEANUP_FAILED");
  }
  // Withdrawal can fail independently of publication (e.g. unavailable Storage).
  const withdrawn = await supabase
    .from("artifact_catalog")
    .select("id")
    .not("deleted_at", "is", null)
    .is("purged_at", null)
    .order("id")
    .limit(100);
  if (withdrawn.error) throw new Error("ARTIFACT_CLEANUP_FAILED");
  for (const artifact of withdrawn.data ?? [])
    await deleteArtifact(artifact.id, { supabase });

  // Setup updates are forward-only. Keep only the current setup for each target;
  // retain its small tombstone when withdrawing bytes so no older release revives.
  const catalog = await listAllArtifacts({ supabase });
  const current = currentSetupIds(catalog);
  for (const artifact of catalog) {
    if (
      artifact.xrag.xrag_type === "setup" &&
      !artifact.deletedAt &&
      !current.has(artifact.id)
    )
      await deleteArtifact(artifact.id, { supabase });
  }
}
