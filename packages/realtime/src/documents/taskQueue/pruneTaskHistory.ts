import type { Doc } from "yjs";
import { getTaskQueue } from "./getTaskQueue.ts";

const MAX_TERMINAL_TASKS = 1000;
const RESULT_GRACE_MS = 5 * 60_000;
const HISTORY_TTL_MS = 24 * 60 * 60_000;

/** Keep fresh results/abort acknowledgements, then bound terminal history by
 * count and age. Active work is never removed. Unknown legacy ages start now. */
export function pruneTaskHistory(
  document: Doc,
  legacySeenAt: Map<string, number>,
  now = Date.now(),
) {
  const { tasks, abortRequests } = getTaskQueue(document);
  const entries = tasks.toArray();
  const terminal = entries
    .flatMap((task, index) => {
      if (!["finished", "aborted", "error"].includes(task.state)) return [];
      const timestamp =
        task.state === "aborted"
          ? task.abortedAtISO
          : "finishedAtISO" in task
            ? task.finishedAtISO
            : undefined;
      let completedAt = timestamp ? Date.parse(timestamp) : NaN;
      if (!Number.isFinite(completedAt) || completedAt > now) {
        if (!legacySeenAt.has(task.id)) legacySeenAt.set(task.id, now);
        completedAt = legacySeenAt.get(task.id)!;
      }
      return [{ task, index, completedAt }];
    })
    .sort((a, b) => b.completedAt - a.completedAt || b.index - a.index);
  const removed = terminal.filter(
    (entry, index) =>
      now - entry.completedAt >= HISTORY_TTL_MS ||
      (index >= MAX_TERMINAL_TASKS &&
        now - entry.completedAt >= RESULT_GRACE_MS),
  );
  const remaining = new Set(entries.map((task) => task.id));
  document.transact(() => {
    for (const { task, index } of removed.toSorted(
      (a, b) => b.index - a.index,
    )) {
      tasks.delete(index, 1);
      abortRequests.delete(task.id);
      remaining.delete(task.id);
    }
    for (const [id, requestedAt] of abortRequests) {
      if (remaining.has(id)) continue;
      const age = now - Date.parse(requestedAt);
      if (!Number.isFinite(age) || age >= RESULT_GRACE_MS)
        abortRequests.delete(id);
    }
  });
  for (const id of legacySeenAt.keys())
    if (!remaining.has(id)) legacySeenAt.delete(id);
}
