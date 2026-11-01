import type { SupabaseClient } from "../_shared/_types.ts";

/** Uses the caller's Storage read policy, including anonymous logo access. */
export async function downloadThemeLogo(
  path: string,
  { supabase, signal }: { supabase: SupabaseClient; signal?: AbortSignal },
) {
  return supabase.storage
    .from("theme_logos")
    .download(path, undefined, { signal });
}
