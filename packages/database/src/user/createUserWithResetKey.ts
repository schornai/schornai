import type { SupabaseClient } from "../_shared/_types.ts";
import { randomBytes } from "node:crypto";

// Call only after authorizing the administrator, or from the local operator's
// empty-instance bootstrap in createInitialAdminWithResetKey.
export async function createUserWithResetKey(
  {
    email,
    firstName,
    lastName,
  }: { email: string; firstName?: string; lastName?: string },
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
) {
  const passwordResetKey = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const {
    data: { user },
    error,
  } = await supabaseServiceRole.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
    },
    password: randomBytes(48).toString("base64url"),
  });
  if (error || !user) throw new Error("CREATE_USER_FAILED");

  try {
    await supabaseServiceRole
      .from("user_password_reset_key")
      .insert({
        expires,
        for_user_id: user.id,
        reset_key: passwordResetKey,
      })
      .throwOnError();
  } catch {
    // Do not leave an account whose initial credentials were never delivered.
    const { error: cleanupError } =
      await supabaseServiceRole.auth.admin.deleteUser(user.id);
    if (cleanupError) throw new Error("CREATE_USER_CLEANUP_FAILED");
    throw new Error("CREATE_USER_FAILED");
  }
  return { expires, passwordResetKey, userId: user.id };
}
