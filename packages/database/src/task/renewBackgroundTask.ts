import type { TaskClaimOptions } from "./_types.ts";

/** Server-only; requires a trusted worker/coordinator, never a browser client. */
export async function renewBackgroundTask(
  taskId: string,
  ownerToken: string,
  { supabaseServiceRole }: TaskClaimOptions,
) {
  const { data, error } = await supabaseServiceRole
    .rpc("renew_background_task", {
      p_task_id: taskId,
      p_owner_token: ownerToken,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("TASK_CLAIM_UNAVAILABLE");

  return data;
}
