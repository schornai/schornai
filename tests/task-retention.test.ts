import { afterEach, expect, it, vi } from "vitest";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import { pruneTaskHistory } from "../packages/realtime/src/documents/taskQueue/pruneTaskHistory";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { TaskCoordinator } from "../packages/realtime/src/documents/taskQueue/TaskCoordinator";
import { taskClaimStore } from "./helpers/task-claims";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
const now = Date.now();
const task = (id: string, state = "finished", age = 10 * 60_000): any => ({
  id,
  state,
  type: "model-do-generate",
  requiredCapabilities: [],
  parameters: { modelId: "model" },
  claimedBy: "worker",
  claimedAtISO: new Date(now - age - 1000).toISOString(),
  ...(state === "aborted"
    ? {
        abortedAtISO: new Date(now - age).toISOString(),
        abortingAtISO: new Date(now - age - 500).toISOString(),
      }
    : { finishedAtISO: new Date(now - age).toISOString() }),
  result: { text: "x".repeat(1024) },
});
afterEach(() => vi.useRealTimers());
it("bounds terminal history while retaining active work, recent results and their abort acknowledgements", () => {
  const doc = new Doc();
  const { tasks, abortRequests } = getTaskQueue(doc);
  tasks.push(
    Array.from({ length: 1100 }, (_, i) =>
      task(`old-${i}`, ["finished", "aborted", "error"][i % 3], 600_000 + i),
    ),
  );
  const fresh = Array.from({ length: 20 }, (_, i) =>
    task(`fresh-${i}`, "aborted", 1000),
  );
  tasks.push([
    ...fresh,
    ...["pending", "claimed", "aborting"].map((state) =>
      task(state, state, 172_800_000),
    ),
  ]);
  for (const entry of tasks.toArray())
    abortRequests.set(entry.id, new Date(now - 172_800_000).toISOString());
  const previousSize = encodeStateAsUpdate(doc).byteLength;
  pruneTaskHistory(doc, new Map(), now);
  expect(tasks.length).toBe(1003);
  for (const id of [
    ...fresh.map((t) => t.id),
    "pending",
    "claimed",
    "aborting",
  ]) {
    expect(tasks.toArray().some((t) => t.id === id)).toBe(true);
    expect(abortRequests.has(id)).toBe(true);
  }
  expect(abortRequests.has("old-1099")).toBe(false);
  expect(encodeStateAsUpdate(doc).byteLength).toBeLessThan(previousSize);
  const copy = new Doc();
  applyUpdate(copy, encodeStateAsUpdate(doc));
  expect(getTaskQueue(copy).tasks.length).toBe(1003);
  copy.destroy();
  doc.destroy();
});
it("keeps an over-limit burst for five minutes before applying the count bound", () => {
  const doc = new Doc();
  const { tasks } = getTaskQueue(doc);
  tasks.push(
    Array.from({ length: 1100 }, (_, i) => task(String(i), "finished", 0)),
  );
  pruneTaskHistory(doc, new Map(), now + 299_999);
  expect(tasks.length).toBe(1100);
  pruneTaskHistory(doc, new Map(), now + 300_000);
  expect(tasks.length).toBe(1000);
  pruneTaskHistory(doc, new Map(), now + 86_400_000);
  expect(tasks.length).toBe(0);
  doc.destroy();
});
it("expires old terminal history and orphan cancellations without discarding an active cancellation", () => {
  const doc = new Doc();
  const { tasks, abortRequests } = getTaskQueue(doc);
  tasks.push([
    task("expired", "error", 86_400_000),
    task("active", "claimed", 172_800_000),
  ]);
  for (const id of ["expired", "active", "orphan"])
    abortRequests.set(id, new Date(now - 86_400_000).toISOString());
  abortRequests.set("just-disconnected", new Date(now).toISOString());
  pruneTaskHistory(doc, new Map(), now);
  expect(tasks.toArray().map((t) => t.id)).toEqual(["active"]);
  expect([...abortRequests.keys()].sort()).toEqual([
    "active",
    "just-disconnected",
  ]);
  doc.destroy();
});
it("gives legacy entries without a valid terminal timestamp a bounded grace period", () => {
  const doc = new Doc();
  const { tasks } = getTaskQueue(doc);
  const seen = new Map<string, number>();
  tasks.push(
    Array.from({ length: 1002 }, (_, i) => ({
      ...task(String(i), "error"),
      finishedAtISO: i === 0 ? "invalid" : undefined,
    })),
  );
  pruneTaskHistory(doc, seen, now);
  expect(tasks.length).toBe(1002);
  pruneTaskHistory(doc, seen, now + 300_000);
  expect(tasks.length).toBe(1000);
  expect(seen.size).toBe(1000);
  pruneTaskHistory(doc, seen, now + 86_400_000);
  expect(tasks.length).toBe(0);
  expect(seen.size).toBe(0);
  doc.destroy();
});
it("cleans up during idle recovery and keeps the durable replay barrier after dropping a payload", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const store = taskClaimStore();
  const doc = new Doc();
  const coordinator = new TaskCoordinator(doc, store.options, async () => {});
  addTask(doc, task("completed", "pending"));
  const owned = (await coordinator.claim("model-do-generate", [], "worker"))!;
  await coordinator.finish(owned.id, owned.claimToken, {
    text: "result",
  } as any);
  await coordinator.reconcile();
  expect(getTaskQueue(doc).tasks.length).toBe(1);
  await vi.advanceTimersByTimeAsync(86_400_001);
  await coordinator.reconcile();
  expect(getTaskQueue(doc).tasks.length).toBe(0);
  expect(store.records.get(owned.id)?.snapshot).toBeNull();
  addTask(doc, task("completed", "pending"));
  expect(
    await coordinator.claim("model-do-generate", [], "replacement"),
  ).toBeUndefined();
  expect(getTaskQueue(doc).tasks.get(0)).toMatchObject({
    state: "error",
    error: "TASK_ALREADY_COMPLETED",
  });
  doc.destroy();
});
