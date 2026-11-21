import type { SchedulerOptions } from "./_types.ts";

export async function claimJob(
  kinds: string[],
  { supabase }: SchedulerOptions,
) {
  const { data, error } = await supabase.rpc("claim_scheduled_job", {
    p_kinds: kinds,
  });
  if (error) throw new Error("SCHEDULER_CLAIM_FAILED");
  return data?.[0];
}
