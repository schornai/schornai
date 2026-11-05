import type { TaskClaimOptions } from "./_types.ts";

/** Server-only. Claim snapshots contain private task inputs and results. */
export async function getTaskClaims(
  taskIds: string[],
  { supabaseServiceRole }: TaskClaimOptions,
) {
  if (!taskIds.length) return [];
  const { data, error } = await supabaseServiceRole
    .from("task_claims")
    .select()
    .in("task_id", taskIds)
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("TASK_CLAIM_UNAVAILABLE");
  return data ?? [];
}
