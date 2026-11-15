import type { SupabaseClient } from "../_shared/_types.ts";
import { automationTriggerSchema } from "./_schemas.ts";
import { nextAutomationTime } from "./nextAutomationTime.ts";

/** Internal scheduler only; requires a service-role client. */
export async function dispatchAutomationTimes({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const now = new Date();
  const { data, error } = await supabase
    .from("automations")
    .select("id, revision, next_run_at, trigger")
    .eq("enabled", true)
    .lte("next_run_at", now.toISOString())
    .order("next_run_at")
    .limit(100);
  if (error) throw new Error("AUTOMATION_DISPATCH_FAILED");
  for (const row of data ?? []) {
    const trigger = automationTriggerSchema.parse(row.trigger);
    if (trigger.type !== "time" || !row.next_run_at) continue;
    const next = nextAutomationTime(
      trigger.schedule,
      now,
      new Date(row.next_run_at),
    );
    const { error } = await supabase.rpc("enqueue_automation_time", {
      p_id: row.id,
      p_revision: row.revision,
      p_due: row.next_run_at,
      p_next: next?.toISOString() ?? null!,
    });
    if (error) throw new Error("AUTOMATION_DISPATCH_FAILED");
  }
}
