import type { SupabaseClient } from "../_shared/_types.ts";
import { chatExpirationSchema } from "./expirationSchema.ts";
import type { z } from "zod";

/** Server-only. userId must be authenticated; the RPC checks exact membership.
 * Deadline and scheduler ownership change in a single transaction. */
export async function setChatExpiration(
  input: z.infer<typeof chatExpirationSchema>,
  { userId, supabase }: { userId: string; supabase: SupabaseClient },
) {
  const { agentId, activityId, seconds } = chatExpirationSchema.parse(input);
  const { data, error } = await supabase.rpc("set_chat_expiration", {
    p_document_name: `activity_chat___${activityId}_${agentId}`,
    p_user_id: userId,
    p_seconds: seconds!,
  });
  if (error) throw new Error("CHAT_EXPIRATION_SAVE_FAILED");
  return { expiresAt: data, seconds };
}
