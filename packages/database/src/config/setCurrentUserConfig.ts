import type { Json } from "../_shared/_supabase.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserConfigKey } from "./_types.ts";
import { getCurrentUser } from "../user/getCurrentUser.ts";
import { setUserConfig } from "./setUserConfig.ts";
export async function setCurrentUserConfig(
  key: UserConfigKey,
  patchValue: Record<string, Json>,
  { supabase }: { supabase: SupabaseClient },
) {
  const user = await getCurrentUser({ supabaseAuth: supabase.auth });
  return setUserConfig(user.id, key, patchValue, { supabase });
}
