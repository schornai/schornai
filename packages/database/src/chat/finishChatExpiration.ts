import type { SupabaseClient } from "../_shared/_types.ts";

/** Trusted cleanup worker, after file and history deletion. The tombstone stays. */
export async function finishChatExpiration(
  documentId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("realtime_document_access")
    .delete()
    .eq("document_id", documentId);
  if (error) throw new Error("CHAT_EXPIRATION_FINISH_FAILED");
}
