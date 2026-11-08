import type { SupabaseClient } from "../_shared/_types.ts";

/** Trusted worker: acknowledge only after delivery. Duplicate notifications after
 * an ambiguous transport failure are safe; missing notifications are not.
 */
export async function announceArtifactPublications(
  announce: (id: string) => Promise<void>,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("artifact_publications")
    .select("id,artifact_id")
    .eq("state", "published")
    .is("announced_at", null)
    .order("updated_at")
    .limit(100);
  if (error) throw new Error("ARTIFACT_OUTBOX_FAILED");
  for (const job of data ?? []) {
    await announce(job.artifact_id!);
    const saved = await supabase
      .from("artifact_publications")
      .update({ announced_at: new Date().toISOString() })
      .eq("id", job.id);
    if (saved.error) throw new Error("ARTIFACT_OUTBOX_FAILED");
  }
}
