import type { SchedulerOptions } from "./_types.ts";

export async function renewJob(
  id: string,
  token: string,
  { supabase }: SchedulerOptions,
) {
  const { data, error } = await supabase.rpc("renew_scheduled_job", {
    p_id: id,
    p_token: token,
  });
  if (error) throw new Error("SCHEDULER_RENEW_FAILED");
  return data === true;
}
