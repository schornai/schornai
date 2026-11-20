import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { xragExportJobSchema } from "./cancelXRAGExport.ts";

export async function deleteXRAGExport(
  input: { jobId: string },
  options: XRAGOptions,
) {
  const { jobId } = xragExportJobSchema.parse(input);
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const userId = await getXRAGUserId(options);
  const db = options.supabaseServiceRole;
  const { data: job, error } = await db
    .from("xrag_export_jobs")
    .select("state,object_path")
    .eq("id", jobId)
    .eq("user_id", userId)
    .in("state", ["finished", "cancelled", "error"])
    .single();
  if (error || !job) throw new Error("XRAG_EXPORT_FAILED");

  // Terminal jobs have immutable archive paths. Keep the row until Storage
  // succeeds so a failed removal can be retried with the same path.
  if (job.object_path) {
    const removed = await db.storage
      .from("xrag-exports")
      .remove([job.object_path]);
    if (removed.error) throw new Error("XRAG_EXPORT_FAILED");
  }
  const deleted = await db
    .from("xrag_export_jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("state", job.state);
  if (deleted.error) throw new Error("XRAG_EXPORT_FAILED");
}
