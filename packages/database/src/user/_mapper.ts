import type { User, UserProfileDatabaseRow } from "./_types.ts";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function mapUser(
  dbUser: SupabaseUser,
  dbUserProfile?: UserProfileDatabaseRow | null,
): User {
  // SAML attribute mappings live under custom_claims. They are display
  // defaults only; local profile fields remain authoritative, even when empty.
  const claims = dbUser.user_metadata?.custom_claims;
  const defaults =
    claims && typeof claims === "object" && !Array.isArray(claims)
      ? (claims as Record<string, unknown>)
      : {};
  const text = (value: unknown) =>
    typeof value === "string" ? value : undefined;
  const firstName =
    dbUserProfile?.first_name ??
    text(defaults.firstName) ??
    text(defaults.first_name);
  const lastName =
    dbUserProfile?.last_name ??
    text(defaults.lastName) ??
    text(defaults.last_name);
  const ownAvatarUrl = dbUserProfile?.avatar_url ?? undefined;
  const ssoAvatar = text(defaults.avatarUrl) ?? text(defaults.avatar_url);
  const avatarUrl =
    ownAvatarUrl ??
    (ssoAvatar && /^https?:\/\//i.test(ssoAvatar) ? ssoAvatar : undefined);
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();

  return {
    avatarUrl,
    ownAvatarUrl,
    email: dbUser.email,
    firstName,
    id: dbUser.id,
    lastName,
    lastSignInAt: dbUser.last_sign_in_at
      ? new Date(dbUser.last_sign_in_at)
      : undefined,
    name: name.length > 0 ? name : undefined,
    signInMethod:
      !dbUser.is_sso_user && dbUser.app_metadata.provider === "email"
        ? "email"
        : "sso",
  };
}
