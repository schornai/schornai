import type { TaskClaimOptions } from "./_types.ts";
/** Server-only. Call only after recovered documents have been durably stored. */
export async function completeTaskRecovery(
  taskId: string,
  { supabaseServiceRole }: TaskClaimOptions,
) {
  const { error } = await supabaseServiceRole
    .from("task_claims")
    .update({ recovery_pending: false })
    .eq("task_id", taskId)
    .neq("state", "claimed")
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("TASK_CLAIM_UNAVAILABLE");
}
