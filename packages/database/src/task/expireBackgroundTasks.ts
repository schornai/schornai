import type { TaskClaimOptions } from "./_types.ts";

/** Server-only; requires a trusted worker/coordinator, never a browser client. */
export async function expireBackgroundTasks({
  supabaseServiceRole,
}: TaskClaimOptions) {
  const { data, error } = await supabaseServiceRole
    .rpc("expire_background_tasks", {})
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("TASK_CLAIM_UNAVAILABLE");

  return data ?? [];
}
