import { prepareXRAGJob } from "@schornio/aibox-database/xrag/prepareXRAGJob";
import { recoverXRAGImports } from "@schornio/aibox-database/xrag/recoverXRAGImports";
import { processXRAGImportFiles } from "@schornio/aibox-realtime/platform/processXRAGImportFiles";
import type { Hocuspocus } from "@hocuspocus/server";
import { expireChat } from "./expireChat.ts";
import { scheduleJob } from "@schornio/aibox-database/scheduler/scheduleJob";
import { cleanupXRAGTransfers } from "@schornio/aibox-database/xrag/cleanupXRAGTransfers";
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
  await scheduleJob(
    {
      id: "system:xrag.transfer.cleanup",
      kind: "xrag.transfer.cleanup",
      payload: {},
      runAt: new Date(),
      intervalSeconds: 60,
      maxAttempts: 100,
    },
    options,
  );
  await scheduleJob(
    {
      id: "system:xrag.import.recover",
      kind: "xrag.import.recover",
      payload: {},
      runAt: new Date(),
      intervalSeconds: 30,
      maxAttempts: 100,
    },
    options,
  );
  // A slow attachment or an event backlog must not delay chat deletion and
  // system maintenance. Each lane still claims only one job at a time.
  await Promise.all([
    schedulerWorker({ ...options, handlers }),
    schedulerWorker({
      ...options,
      handlers: new Map([
        [
          "xrag.import.prepare",
          (job, signal) =>
            prepareXRAGJob(job.payload, options.supabase, signal),
        ],
      ]),
    }),
    schedulerWorker({
      ...options,
      handlers: new Map([
        [
          "xrag.transfer.cleanup",
          async (_job, signal) => {
            signal.throwIfAborted();
            await cleanupXRAGTransfers(options);
          },
        ],
      ]),
    }),
    schedulerWorker({
      ...options,
      handlers: new Map([
        [
          "xrag.import.recover",
          (_job, signal) => recoverXRAGImports({ ...options, signal }),
        ],
      ]),
    }),
    schedulerWorker({
      ...options,
      handlers: new Map([
        [
          "xrag.import.process",
          (job, signal) => {
            const payload = job.payload as { importId: string };
            return processXRAGImportFiles(payload.importId, {
              ...options,
              signal,
            });
          },
        ],
      ]),
    }),
    schedulerWorker({
      ...options,
      handlers: new Map([
        [
          "automation.run",
          (job, signal) => runAutomation(job, signal, options),
        ],
      ]),
    }),
  ]);
}
