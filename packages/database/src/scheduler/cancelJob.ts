import type { SchedulerOptions } from "./_types.ts";

/** Authorize the target before calling. Revokes ownership; an already running
 * side effect may still finish. The ID may be scheduled again after deletion. */
export async function cancelJob(id: string, { supabase }: SchedulerOptions) {
  const { error } = await supabase.from("scheduled_jobs").delete().eq("id", id);
  if (error) throw new Error("SCHEDULER_CANCEL_FAILED");
}
