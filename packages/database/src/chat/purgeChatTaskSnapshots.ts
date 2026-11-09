import type { SupabaseClient } from "../_shared/_types.ts";

/** Trusted deletion worker only, after associated tasks have stopped. */
export async function purgeChatTaskSnapshots(
  documentName: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase.rpc("purge_chat_task_snapshots", {
    p_document_name: documentName,
  });
  if (error) throw new Error("CHAT_TASK_CLEANUP_FAILED");
}
