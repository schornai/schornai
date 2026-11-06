import type { TaskClaimOptions } from "./_types.ts";

/** Server-only. Discard old payloads after recovery; retain task IDs so a stale
 * queue replica can never execute an already claimed task again. */
export async function pruneTaskClaimSnapshots({
  supabaseServiceRole,
}: TaskClaimOptions) {
  const { error } = await supabaseServiceRole
    .rpc("prune_task_claim_snapshots", {})
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("TASK_CLAIM_UNAVAILABLE");
}
