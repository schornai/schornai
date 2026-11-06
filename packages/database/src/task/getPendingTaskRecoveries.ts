import type { TaskClaimOptions } from "./_types.ts";
/** Server-only. Retried until recovery of the affected documents is durable. */
export async function getPendingTaskRecoveries({
  supabaseServiceRole,
}: TaskClaimOptions) {
  const { data, error } = await supabaseServiceRole
    .from("task_claims")
    .select()
    .eq("recovery_pending", true)
    .order("completed_at")
    .limit(100)
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("TASK_CLAIM_UNAVAILABLE");
  return data ?? [];
}
