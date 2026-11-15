import type { SupabaseClient } from "../_shared/_types.ts";

/** Internal scheduler only. A live job lease and unchanged definition are
 * checked atomically before any external chat side effects. */
export async function beginAutomationRun(
  id: string,
  token: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase.rpc("begin_automation_run", {
    p_id: id,
    p_token: token,
  });
  if (error) throw new Error("AUTOMATION_BEGIN_FAILED");
  return data?.[0] ?? null;
}
