import type { SupabaseClient } from "../_shared/_types.ts";

/**
 * Server-only: authorize creation and derive userIds from authenticated users
 * before passing a service-role client. Existing document ACLs are never widened.
 */
export async function ensureRealtimeDocument(
  documentName: string,
  { userIds }: { userIds: string[] },
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase.rpc("ensure_realtime_document", {
    p_document_name: documentName,
    p_user_ids: userIds,
  });
  if (error || !data) throw new Error("DOCUMENT_ACCESS_DENIED");
  return data;
}
