import type { SupabaseClient } from "../_shared/_types.ts";

export async function redeemPasswordResetKey(
  {
    email,
    password,
    passwordResetKey,
  }: { email: string; password: string; passwordResetKey: string },
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
) {
  const now = new Date().toISOString();
  const { data: key, error } = await supabaseServiceRole
    .from("user_password_reset_key")
    .select("id, for_user_id")
    .eq("reset_key", passwordResetKey)
    .is("used", null)
    .gt("expires", now)
    .maybeSingle();
  if (error || !key) throw new Error("INVALID_RESET_KEY");

  const {
    data: { user },
    error: userError,
  } = await supabaseServiceRole.auth.admin.getUserById(key.for_user_id);
  if (
    userError ||
    !user ||
    user.email?.toLowerCase() !== email.toLowerCase() ||
    user.is_sso_user
  ) {
    throw new Error("INVALID_RESET_KEY");
  }

  // Claim atomically before changing credentials: only one concurrent request wins.
  const used = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseServiceRole
    .from("user_password_reset_key")
    .update({ used })
    .eq("id", key.id)
    .is("used", null)
    .gt("expires", used)
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) throw new Error("INVALID_RESET_KEY");

  const { error: updateError } =
    await supabaseServiceRole.auth.admin.updateUserById(key.for_user_id, {
      password,
    });
  if (updateError) {
    // A rejected password does not consume the key. Ambiguous network failures stay closed.
    if (
      updateError.status &&
      updateError.status >= 400 &&
      updateError.status < 500
    ) {
      await supabaseServiceRole
        .from("user_password_reset_key")
        .update({ used: null })
        .eq("id", key.id)
        .eq("used", used)
        .throwOnError();
    }
    throw new Error("RESET_PASSWORD_FAILED");
  }
}
