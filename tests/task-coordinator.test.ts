import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { Doc, encodeStateAsUpdate, applyUpdate } from "yjs";
import { TaskCoordinator } from "../packages/realtime/src/documents/taskQueue/TaskCoordinator";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
import { requestTaskAbort } from "../packages/realtime/src/documents/taskQueue/requestTaskAbort";
import { validateQueueUpdate } from "../packages/realtime/src/documents/taskQueue/validateQueueUpdate";
import { replaceTask } from "../packages/realtime/src/documents/taskQueue/replaceTask";
import {
  encodeTaskValue,
  decodeTaskValue,
} from "../packages/realtime/src/documents/taskQueue/_taskCodec";
import { taskClaimStore } from "./helpers/task-claims";
const task = (id = "task"): any => ({
  id,
  type: "model-do-generate",
  state: "pending",
  requiredCapabilities: ["model"],
  parameters: {
    modelId: "model",
    prompt: [{ content: new Uint8Array([0, 128, 255]) }],
  },
});
let store: ReturnType<typeof taskClaimStore>;
let document: Doc;
let recover: ReturnType<typeof vi.fn>;
let coordinator: TaskCoordinator;
beforeEach(() => {
  vi.useFakeTimers();
  store = taskClaimStore();
  document = new Doc();
  recover = vi.fn(async () => {});
  coordinator = new TaskCoordinator(document, store.options, recover);
});
afterEach(() => {
  document.destroy();
  vi.useRealTimers();
});
const claim = () =>
  coordinator.run(() =>
    coordinator.claim("model-do-generate", ["model"], "worker"),
  );
it("grants one durable owner across independent stale replicas and preserves binary inputs", async () => {
  addTask(document, task());
  const other = new Doc();
  applyUpdate(other, encodeStateAsUpdate(document));
  const second = new TaskCoordinator(other, store.options, recover);
  const results = await Promise.all([
    claim(),
    second.run(() => second.claim("model-do-generate", ["model"], "worker")),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(store.records.size).toBe(1);
  const winner = results.find(Boolean)!;
  expect((winner.parameters as any).prompt[0].content).toEqual(
    new Uint8Array([0, 128, 255]),
  );
  expect(await coordinator.finish("task", "wrong-owner", undefined)).toBe(
    false,
  );
  expect(
    await coordinator.finish("task", winner.claimToken, {
      content: new Uint8Array([1, 2]),
    } as any),
  ).toBe(true);
  expect(getTaskQueue(document).tasks.get(0)).toMatchObject({
    state: "finished",
    result: { content: new Uint8Array([1, 2]) },
  });
  expect(
    await coordinator.finish(
      "task",
      winner.claimToken,
      undefined,
      "late failure",
    ),
  ).toBe(false);
  other.destroy();
});
it("does not acknowledge a claim while the durable store is unavailable", async () => {
  addTask(document, task());
  store.setUnavailable(true);
  await expect(claim()).rejects.toThrow("TASK_CLAIM_UNAVAILABLE");
  expect(getTaskQueue(document).tasks.get(0).state).toBe("pending");
  store.setUnavailable(false);
  expect(await claim()).toBeTruthy();
});
it("renews ownership and expires interrupted work without replaying it", async () => {
  addTask(document, task());
  const owned = (await claim())!;
  await vi.advanceTimersByTimeAsync(80_000);
  expect(await coordinator.renew("task", owned.claimToken)).toBe(true);
  await vi.advanceTimersByTimeAsync(80_000);
  await coordinator.reconcile();
  expect(recover).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(10_001);
  expect(await coordinator.renew("task", owned.claimToken)).toBe(false);
  expect(await coordinator.finish("task", owned.claimToken, undefined)).toBe(
    false,
  );
  await coordinator.reconcile();
  expect(getTaskQueue(document).tasks.get(0)).toMatchObject({
    state: "error",
    error: "TASK_WORKER_LOST",
  });
  expect(recover).toHaveBeenCalledOnce();
  // Even a pre-claim Yjs snapshot cannot start these effects a second time.
  const restarted = new Doc();
  addTask(restarted, task());
  const next = new TaskCoordinator(restarted, store.options, recover);
  expect(
    await next.claim("model-do-generate", ["model"], "replacement"),
  ).toBeUndefined();
  expect(getTaskQueue(restarted).tasks.get(0).state).toBe("error");
  restarted.destroy();
});
it("recovers orphan claims after restart and retries failed document recovery", async () => {
  addTask(document, task());
  await claim();
  const restarted = new Doc();
  const failed = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(undefined);
  const next = new TaskCoordinator(restarted, store.options, failed);
  await vi.advanceTimersByTimeAsync(90_001);
  await next.reconcile();
  expect(store.records.get("task")?.recovery_pending).toBe(true);
  await next.reconcile();
  expect(store.records.get("task")?.recovery_pending).toBe(false);
  expect(failed).toHaveBeenCalledTimes(2);
  expect(getTaskQueue(restarted).tasks.get(0).state).toBe("error");
  restarted.destroy();
});
it("finishes queued cancellation without a capable worker and fences late completion", async () => {
  addTask(document, task());
  requestTaskAbort(document, "task");
  await coordinator.reconcile();
  expect(getTaskQueue(document).tasks.get(0).state).toBe("aborted");
  expect(await claim()).toBeUndefined();
  expect(recover).toHaveBeenCalledOnce();
});
it("marks legacy claimed tasks interrupted rather than granting a new owner", async () => {
  addTask(document, task());
  replaceTask(document, {
    ...task(),
    state: "claimed",
    claimedBy: "old-worker",
    claimedAtISO: new Date().toISOString(),
  });
  await coordinator.reconcile();
  expect(getTaskQueue(document).tasks.get(0)).toMatchObject({
    state: "error",
    error: "TASK_WORKER_LOST",
  });
  expect(await claim()).toBeUndefined();
});
it("rejects client-side lifecycle changes but permits submissions, cancellation and result consumption", async () => {
  addTask(document, task());
  const replica = new Doc();
  applyUpdate(replica, encodeStateAsUpdate(document));
  replaceTask(replica, {
    ...task(),
    state: "claimed",
    claimedBy: "old-worker",
    claimedAtISO: new Date().toISOString(),
  });
  expect(() =>
    validateQueueUpdate(document, encodeStateAsUpdate(replica)),
  ).toThrow("TASK_COORDINATOR_REQUIRED");
  replica.destroy();
  const producer = new Doc();
  applyUpdate(producer, encodeStateAsUpdate(document));
  addTask(producer, task("second"));
  requestTaskAbort(producer, "task");
  expect(() =>
    validateQueueUpdate(document, encodeStateAsUpdate(producer)),
  ).not.toThrow();
  producer.destroy();
  const owned = (await claim())!;
  await coordinator.finish("task", owned.claimToken, undefined);
  const consumer = new Doc();
  applyUpdate(consumer, encodeStateAsUpdate(document));
  getTaskQueue(consumer).tasks.delete(0);
  expect(() =>
    validateQueueUpdate(document, encodeStateAsUpdate(consumer)),
  ).not.toThrow();
  consumer.destroy();
});
it("retains the Yjs wire value types in transport snapshots", () => {
  expect(
    decodeTaskValue(
      encodeTaskValue({
        bytes: new Uint8Array([1, 2, 3]),
        nested: [null, undefined, true],
      }),
    ),
  ).toEqual({
    bytes: new Uint8Array([1, 2, 3]),
    nested: [null, undefined, true],
  });
});

it("does not restore purged chat prompts from a stale queue replica", async () => {
  const original = {
    ...task(),
    chat: { activityId: "activity", agentId: "agent" },
  };
  addTask(document, original);
  await coordinator.apply(
    {
      task_id: original.id,
      owner_token: "old",
      state: "error",
      snapshot: null,
      recovery_pending: false,
      completed_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      chat_document_name: "activity_chat___activity_agent",
    },
    original,
  );
  expect(getTaskQueue(document).tasks.length).toBe(0);
  expect(recover).not.toHaveBeenCalled();
});
