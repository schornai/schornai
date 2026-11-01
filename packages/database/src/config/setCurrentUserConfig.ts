import type { Json } from "../_shared/_supabase.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserConfigKey } from "./_types.ts";
import { getCurrentUser } from "../user/getCurrentUser.ts";

export async function setCurrentUserConfig(
  key: UserConfigKey,
  patchValue: Record<string, Json>,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("settings_user")
    .select()
    .eq("key", key)
    .maybeSingle()
    .throwOnError();

  if (data) {
    await supabase
      .from("settings_user")
      .update({
        value: {
          ...(typeof data.value === "object" ? data.value : {}),
          ...patchValue,
        },
      })
      .eq("key", key)
      .throwOnError();
  } else {
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });
    await supabase
      .from("settings_user")
      .insert({ key, user_id: user.id, value: patchValue })
      .throwOnError();
  }
}
