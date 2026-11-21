import type { SupabaseClient } from "../_shared/_types.ts";

/** Internal worker only. Error codes are fixed public values, never raw errors. */
export async function finishAutomationRun(
  id: string,
  state: "queued" | "failed",
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("automation_runs")
    .update({
      state,
      error_code: state === "failed" ? "AUTOMATION_EXECUTION_FAILED" : null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("state", "started");
  if (error) throw new Error("AUTOMATION_FINISH_FAILED");
}
