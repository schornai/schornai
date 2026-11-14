import type { Hocuspocus } from "@hocuspocus/server";
import { expireChat } from "./expireChat.ts";
import { scheduleJob } from "@schornio/aibox-database/scheduler/scheduleJob";
import { cleanupArtifactPublications } from "@schornio/aibox-database/xrag/cleanupArtifactPublications";
import type { SchedulerOptions } from "@schornio/aibox-database/scheduler/_types";
import { schedulerWorker, type JobHandler } from "./worker.ts";
import { dispatchAutomationTimes } from "@schornio/aibox-database/automation/dispatchAutomationTimes";
import { runAutomation } from "./runAutomation.ts";

export async function startScheduler(
  options: SchedulerOptions & {
    signal: AbortSignal;
    instance: Hocuspocus;
    serverToken: `Worker ${string}`;
  },
) {
  const handlers = new Map<string, JobHandler>([
    ["automation.run", (job, signal) => runAutomation(job, signal, options)],
    [
      "automation.dispatch",
      async (_job, signal) => {
        signal.throwIfAborted();
        await dispatchAutomationTimes(options);
      },
    ],
    ["chat.expire", (job, signal) => expireChat(job, signal, options)],
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
      id: "system:automation.dispatch",
      kind: "automation.dispatch",
      payload: {},
      runAt: new Date(),
      intervalSeconds: 10,
      maxAttempts: 100,
    },
    options,
  );
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
