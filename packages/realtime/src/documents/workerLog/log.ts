import type { WorkerLogEntry } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

const MAX_LOG_ENTRIES = 1000;

export function log(document: YDoc, logEntry: WorkerLogEntry) {
  const workers = document.getMap<WorkerLogEntry[]>("workers");

  document.transact(() => {
    const entries = workers.get(logEntry.workerId);
    const overflowCount = Math.max(
      0,
      (entries?.length ?? 0) - MAX_LOG_ENTRIES + 1,
    );
    const newEntries = entries?.toSpliced(0, overflowCount) ?? [];
    newEntries.push(logEntry);
    workers.set(logEntry.workerId, newEntries);
  });
}
