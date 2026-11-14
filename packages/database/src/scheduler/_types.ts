import type { Database } from "../_shared/_supabase.ts";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Trusted server use only. Authorize the operation and target before scheduling. */
export type SchedulerOptions = { supabase: SupabaseClient };
export type ScheduledJob =
  Database["public"]["Tables"]["scheduled_jobs"]["Row"];
export type ScheduleJob = Pick<ScheduledJob, "id" | "kind" | "payload"> & {
  runAt: Date;
  intervalSeconds?: number;
  maxAttempts?: number;
};
