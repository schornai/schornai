import type { SupabaseClient } from "../_shared/_types.ts";

export function isChatDocument(documentName: string) {
  return (
    documentName.startsWith("activity_chat___") ||
    documentName.startsWith("activity_chat_currentMessage___") ||
    documentName.startsWith("storage___activity_")
  );
}

/** Privileged realtime-server guard, also applied to workers and loaded docs. */
export async function isChatDeleted(
  documentName: string,
  { supabase }: { supabase: SupabaseClient },
) {
  if (!isChatDocument(documentName)) return false;
  const { data, error } = await supabase.rpc("is_chat_deleted", {
    p_document_name: documentName,
  });
  if (error) throw new Error("CHAT_DELETION_CHECK_FAILED");
  return data === true;
}
