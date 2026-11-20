import type { SupabaseClient } from "../_shared/_types.ts";
import { recoverXRAGImport } from "./recoverXRAGImport.ts";

/** Scheduler maintenance. Failed recovery retains both reservations and undo files. */
export async function recoverXRAGImports({
  supabase,
  signal,
}: {
  supabase: SupabaseClient;
  signal?: AbortSignal;
}) {
  const pending = await supabase
    .from("xrag_import_transactions")
    .select("id")
    .is("cleaned_at", null)
    .lt("expires_at", new Date().toISOString())
    .order("expires_at")
    .limit(10);
  if (pending.error) throw new Error("XRAG_IMPORT_RECOVERY_FAILED");
  let failed = false;
  for (const job of pending.data ?? []) {
    signal?.throwIfAborted();
    try {
      await recoverXRAGImport(job.id, { supabase, signal });
    } catch {
      // A permanently unavailable object must not starve other recoveries.
      await supabase
        .from("xrag_import_transactions")
        .update({ expires_at: new Date(Date.now() + 60_000).toISOString() })
        .eq("id", job.id)
        .in("state", ["committed", "rolled_back"]);
      failed = true;
    }
  }
  if (failed) throw new Error("XRAG_IMPORT_RECOVERY_FAILED");
  const pruned = await supabase.rpc("prune_xrag_import_transactions");
  if (pruned.error) throw new Error("XRAG_IMPORT_CLEANUP_FAILED");
}
