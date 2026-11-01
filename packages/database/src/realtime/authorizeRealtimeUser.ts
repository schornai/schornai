import type { SupabaseClient } from "../_shared/_types.ts";
import { getRealtimeDocumentPermission } from "./getRealtimeDocumentPermission.ts";

/** The client must carry this user's token so every data query enforces RLS. */
export async function authorizeRealtimeUser(
  token: string,
  documentName: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const [
    { data: userData, error: userError },
    { data: claimsData, error: claimsError },
  ] = await Promise.all([
    supabase.auth.getUser(token),
    supabase.auth.getClaims(token),
  ]);
  if (
    userError ||
    claimsError ||
    !userData.user ||
    !claimsData ||
    claimsData.claims.sub !== userData.user.id
  )
    return undefined;
  const expiresAt = Number(claimsData.claims.exp) * 1000;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return undefined;
  const permission = await getRealtimeDocumentPermission(documentName, {
    supabase,
    userId: userData.user.id,
    isAdmin: claimsData.claims.organization_roles === "admin",
  });
  return permission ? { permission, expiresAt } : undefined;
}
