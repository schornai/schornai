import type { ScheduleJob, SchedulerOptions } from "./_types.ts";

/** Inserts once by stable ID; repeated registration never resets existing work.
 * Caller must authorize the job kind, payload and target resource.
 */
export async function scheduleJob(
  job: ScheduleJob,
  { supabase }: SchedulerOptions,
) {
  const { error } = await supabase.from("scheduled_jobs").upsert(
    {
      id: job.id,
      kind: job.kind,
      payload: job.payload,
      run_at: job.runAt.toISOString(),
      interval_seconds: job.intervalSeconds,
      max_attempts: job.maxAttempts,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw new Error("SCHEDULER_SCHEDULE_FAILED");
}
