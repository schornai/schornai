import type { TaskClaimOptions } from "./_types.ts";

/** Server-only; requires a trusted worker/coordinator, never a browser client. */
export async function finishBackgroundTask(
  taskId: string,
  ownerToken: string,
  state: "finished" | "aborted" | "error",
  snapshot: string,
  { supabaseServiceRole }: TaskClaimOptions,
) {
  const { data, error } = await supabaseServiceRole
    .rpc("finish_background_task", {
      p_task_id: taskId,
      p_owner_token: ownerToken,
      p_state: state,
      p_snapshot: snapshot,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("TASK_CLAIM_UNAVAILABLE");

  return data;
}
