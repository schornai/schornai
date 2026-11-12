import { setTimeout as delay } from "node:timers/promises";
import { claimJob } from "@schornio/aibox-database/scheduler/claimJob";
import { renewJob } from "@schornio/aibox-database/scheduler/renewJob";
import { finishJob } from "@schornio/aibox-database/scheduler/finishJob";
import type {
  ScheduledJob,
  SchedulerOptions,
} from "@schornio/aibox-database/scheduler/_types";

export type JobHandler = (
  job: ScheduledJob,
  signal: AbortSignal,
) => Promise<void>;

/** Sequential per worker; other servers can claim independent jobs. Handlers
 * validate payloads, honor cancellation, and make side effects idempotent.
 * Logs intentionally omit payloads and arbitrary handler errors.
 */
export async function schedulerWorker({
  supabase,
  handlers,
  signal,
}: SchedulerOptions & {
  handlers: ReadonlyMap<string, JobHandler>;
  signal: AbortSignal;
}) {
  const options = { supabase };
  const kinds = [...handlers.keys()];
  if (!kinds.length) return;
  while (!signal.aborted) {
    try {
      const job = await claimJob(kinds, options);
      if (job) {
        if (signal.aborted) return; // Let the unstarted claim expire.
        const token = job.lease_token;
        if (!token) throw new Error("SCHEDULER_LEASE_TOKEN_MISSING");
        const controller = new AbortController();
        const heartbeat = new AbortController();
        const abort = () => controller.abort();
        signal.addEventListener("abort", abort, { once: true });
        const renew = (async () => {
          while (!heartbeat.signal.aborted) {
            try {
              await delay(20_000, undefined, { signal: heartbeat.signal });
              if (!(await renewJob(job.id, token, options))) {
                controller.abort();
                return;
              }
            } catch {
              if (!heartbeat.signal.aborted) controller.abort();
              return;
            }
          }
        })();
        try {
          let success = false;
          try {
            const handler = handlers.get(job.kind);
            if (!handler) throw new Error("SCHEDULER_HANDLER_MISSING");
            await handler(job, controller.signal);
            success = true;
          } catch {
            if (!controller.signal.aborted)
              console.error("SCHEDULER_HANDLER_FAILED", job.kind);
          }
          if (
            !controller.signal.aborted &&
            !(await finishJob(job.id, token, success, options))
          )
            console.error("SCHEDULER_LEASE_LOST", job.kind);
        } finally {
          heartbeat.abort();
          await renew;
          signal.removeEventListener("abort", abort);
        }
        continue;
      }
    } catch {
      if (!signal.aborted) console.error("SCHEDULER_UNAVAILABLE");
    }
    await delay(1_000, undefined, { signal }).catch(() => {});
  }
}
