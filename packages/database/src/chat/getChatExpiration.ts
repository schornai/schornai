import type { SupabaseClient } from "../_shared/_types.ts";
import type { ChatExpiration } from "./expirationSchema.ts";

/** User-scoped client required; RLS authorizes the exact chat. */
export async function getChatExpiration(
  { agentId, activityId }: { agentId: string; activityId: string },
  { supabase }: { supabase: SupabaseClient },
): Promise<ChatExpiration> {
  const { data, error } = await supabase
    .from("realtime_documents")
    .select("expires_at,expiry_seconds")
    .eq("document_name", `activity_chat___${activityId}_${agentId}`)
    .single();
  if (error || !data) throw new Error("CHAT_ACCESS_DENIED");
  return { expiresAt: data.expires_at, seconds: data.expiry_seconds };
}
