import type { SupabaseClient } from "../_shared/_types.ts";
import { randomBytes } from "node:crypto";

// The caller must authorize a global administrator before providing this client.
export async function reissuePasswordResetKey(
  userId: string,
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
) {
  const passwordResetKey = randomBytes(32).toString("hex");
  const { data: expires, error } = await supabaseServiceRole.rpc(
    "reissue_password_reset_key",
    { target_user_id: userId, new_reset_key: passwordResetKey },
  );
  // Never propagate database errors that might contain the secret argument.
  if (error || !expires) throw new Error("REISSUE_RESET_KEY_FAILED");
  return { passwordResetKey, expires };
}
