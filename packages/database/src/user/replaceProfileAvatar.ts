import type { SupabaseClient } from "../_shared/_types.ts";
/** Caller supplies the authenticated owner or an authorized admin target and its saved previous avatar. */
export async function replaceProfileAvatar(
  userId: string,
  avatarUrl: string | undefined,
  previousAvatarUrl: string | undefined,
  { supabase }: { supabase: SupabaseClient },
) {
  await supabase
    .from("user_profiles")
    .upsert({ id: userId, avatar_url: avatarUrl ?? null }, { onConflict: "id" })
    .throwOnError();
  if (previousAvatarUrl && previousAvatarUrl !== avatarUrl) {
    const path = previousAvatarUrl.replace(/^user_avatars\//, "");
    // Permit historical root filenames, but never remove another user's folder.
    if (
      !path.split("/").some((part) => part === "." || part === "..") &&
      (path.startsWith(`${userId}/`) || !/[\\/]/.test(path))
    ) {
      const { error } = await supabase.storage
        .from("user_avatars")
        .remove([path]);
      if (error) throw new Error("AVATAR_CLEANUP_FAILED");
    }
  }
}
