import { deletePreparedXRAGTransfer } from "./deletePreparedXRAGTransfer.ts";
import { PREPARED_BUCKET } from "./preparedUpload.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_TRANSFER_BUCKET } from "./transferSchema.ts";

/** Server-only maintenance: pending imports expire after one hour, exports after 72 hours. */
export async function cleanupXRAGTransfers({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const prepared = await supabase.rpc("expired_xrag_prepared_uploads");
  if (prepared.error) throw new Error("XRAG_TRANSFER_CLEANUP_FAILED");
  for (const upload of prepared.data ?? [])
    await deletePreparedXRAGTransfer(upload.source_path, { supabase });
  for (const [rpc, bucket] of [
    ["expired_xrag_prepared_objects", PREPARED_BUCKET],
    ["expired_xrag_transfers", XRAG_TRANSFER_BUCKET],
    ["expired_xrag_exports", "xrag-exports"],
  ] as const) {
    const expired = await supabase.rpc(rpc);
    if (expired.error) throw new Error("XRAG_TRANSFER_CLEANUP_FAILED");
    if (!expired.data?.length) continue;
    const removed = await supabase.storage
      .from(bucket)
      .remove(expired.data.map((file) => file.name));
    if (removed.error) throw new Error("XRAG_TRANSFER_CLEANUP_FAILED");
  }
  const removed = await supabase
    .from("xrag_export_jobs")
    .delete()
    .in("state", ["finished", "error", "cancelled"])
    .lt("updated_at", new Date(Date.now() - 72 * 3600_000).toISOString());
  if (removed.error) throw new Error("XRAG_TRANSFER_CLEANUP_FAILED");
}
