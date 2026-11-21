import type { SchedulerOptions } from "./_types.ts";

export async function finishJob(
  id: string,
  token: string,
  success: boolean,
  { supabase }: SchedulerOptions,
) {
  const { data, error } = await supabase.rpc("finish_scheduled_job", {
    p_id: id,
    p_token: token,
    p_success: success,
  });
  if (error) throw new Error("SCHEDULER_FINISH_FAILED");
  return data === true;
}
