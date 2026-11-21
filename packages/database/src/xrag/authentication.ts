import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserClaims } from "../auth/_types.ts";
import { getCurrentUser } from "../user/getCurrentUser.ts";
import { getCurrentUserClaims } from "../user/getCurrentUserClaims.ts";

export type XRAGOptions = {
  supabase: SupabaseClient;
  supabaseServiceRole: SupabaseClient;
  signal?: AbortSignal;
  /** Only verified server context, matching this client's JWT. Never tool input. */
  authenticated?: { userId: string; claims: UserClaims };
};

export async function getXRAGClaims(
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  return (
    options.authenticated?.claims ??
    getCurrentUserClaims({ supabaseAuth: options.supabase.auth })
  );
}
export async function getXRAGUserId(
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  return (
    options.authenticated?.userId ??
    (await getCurrentUser({ supabaseAuth: options.supabase.auth })).id
  );
}
