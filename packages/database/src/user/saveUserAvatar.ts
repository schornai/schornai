import type { SupabaseClient } from "../_shared/_types.ts";
import { getUserById } from "./getUserById.ts";
import { replaceProfileAvatar } from "./replaceProfileAvatar.ts";
/** Caller authorizes self or global administrator before supplying the service client. */
export async function saveUserAvatar(
  userId: string,
  avatarUrl: string | undefined,
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
) {
  const user = await getUserById(userId, { supabaseServiceRole });
  return replaceProfileAvatar(userId, avatarUrl, user.ownAvatarUrl, {
    supabase: supabaseServiceRole,
  });
}
