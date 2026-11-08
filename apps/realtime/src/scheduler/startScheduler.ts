import { scheduleJob } from "@schornio/aibox-database/scheduler/scheduleJob";
import { cleanupArtifactPublications } from "@schornio/aibox-database/xrag/cleanupArtifactPublications";
import type { SchedulerOptions } from "@schornio/aibox-database/scheduler/_types";
import { schedulerWorker, type JobHandler } from "./worker.ts";

export async function startScheduler(
  options: SchedulerOptions & { signal: AbortSignal },
) {
  const handlers = new Map<string, JobHandler>([
    [
      "artifacts.cleanup",
      async (_job, signal) => {
        signal.throwIfAborted();
        await cleanupArtifactPublications(options);
      },
    ],
  ]);
  await scheduleJob(
    {
      id: "system:artifacts.cleanup",
      kind: "artifacts.cleanup",
      payload: {},
      runAt: new Date(),
      intervalSeconds: 60,
      maxAttempts: 100,
    },
    options,
  );
  await schedulerWorker({ ...options, handlers });
}
