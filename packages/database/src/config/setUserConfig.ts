import type { Json } from "../_shared/_supabase.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserConfigKey } from "./_types.ts";

/** Authenticated caller's ID only, or an explicitly authorized administrator. */
export async function setUserConfig(
  userId: string,
  key: UserConfigKey,
  patchValue: Record<string, Json>,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("settings_user")
    .select("id,value")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle()
    .throwOnError();
  const value = {
    ...(typeof data?.value === "object" && !Array.isArray(data.value)
      ? data.value
      : {}),
    ...patchValue,
  };
  if (data)
    await supabase
      .from("settings_user")
      .update({ value })
      .eq("id", data.id)
      .eq("user_id", userId)
      .throwOnError();
  else
    await supabase
      .from("settings_user")
      .insert({ user_id: userId, key, value })
      .throwOnError();
}
