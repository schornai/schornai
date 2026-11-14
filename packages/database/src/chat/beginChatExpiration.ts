import type { SupabaseClient } from "../_shared/_types.ts";

/** Trusted scheduler only; requires the current live lease. */
export async function beginChatExpiration(
  documentName: string,
  token: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase.rpc("begin_chat_expiration", {
    p_document_name: documentName,
    p_token: token,
  });
  if (error) throw new Error("CHAT_EXPIRATION_BEGIN_FAILED");
  return data?.[0];
}
