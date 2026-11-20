import type { SupabaseClient } from "../_shared/_types.ts";
import { PREPARED_BUCKET, preparedEntriesSchema } from "./preparedUpload.ts";
import { XRAG_TRANSFER_BUCKET } from "./transferSchema.ts";

/** Internal: caller authorizes the exact owner, or runs trusted import cleanup. */
export async function deletePreparedXRAGTransfer(
  path: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const saved = await supabase
    .from("xrag_prepared_uploads")
    .select("entries")
    .eq("source_path", path)
    .maybeSingle();
  if (saved.error) throw new Error("XRAG_TRANSFER_DELETE_FAILED");
  if (saved.data) {
    const entries = preparedEntriesSchema.parse(saved.data.entries);
    const paths = entries
      .flatMap((entry) => [
        entry.source,
        ...(entry.files ?? []).map((file) => file.source),
      ])
      .filter((source) => source?.bucket === PREPARED_BUCKET)
      .map((source) => source!.path);
    for (let index = 0; index < paths.length; index += 100) {
      const removed = await supabase.storage
        .from(PREPARED_BUCKET)
        .remove(paths.slice(index, index + 100));
      if (removed.error) throw new Error("XRAG_TRANSFER_DELETE_FAILED");
    }
  }
  const removed = await supabase.storage
    .from(XRAG_TRANSFER_BUCKET)
    .remove([path]);
  if (removed.error) throw new Error("XRAG_TRANSFER_DELETE_FAILED");
  const deleted = await supabase
    .from("xrag_prepared_uploads")
    .delete()
    .eq("source_path", path);
  if (deleted.error) throw new Error("XRAG_TRANSFER_DELETE_FAILED");
}
