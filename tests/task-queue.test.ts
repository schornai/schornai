import { beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { TaskQueue } from "../packages/realtime/src/documents/taskQueue/TaskQueue";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { registerAbortTask } from "../packages/realtime/src/documents/taskQueue/registerAbortTask";
const state = vi.hoisted(() => ({
  doc: undefined as any,
  token: vi.fn((token: string) => `Worker ${token}`),
}));
vi.mock("../packages/realtime/src/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    static getServerToken = state.token;
    document = state.doc;
    provider = { destroy: vi.fn() };
  },
}));
vi.mock(
  "../packages/realtime/src/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
beforeEach(() => {
  state.doc = new Doc();
});
const config = {
  capabilities: ["model"],
  serverToken: "Worker token" as const,
  workerIdentifier: "worker",
};
const task = (id = "task", capabilities: string[] = []): any => ({
  id,
  type: "model-do-generate",
  state: "pending",
  requiredCapabilities: capabilities,
  parameters: { modelId: "model" },
});
describe("task queue worker lifecycle", () => {
  it("wakes pending work on pushed model changes without polling", async () => {
    vi.useFakeTimers();
    const changes = new EventTarget();
    const capabilities = vi.fn().mockResolvedValue(["old-model"]);
    const stop = new AbortController();
    const queue = new TaskQueue("model-do-generate", {
      ...config,
      capabilities,
      capabilitiesChanged: changes,
    });
    const handler = vi.fn(async () => {
      stop.abort();
      return {} as any;
    });
    const running = queue.handleTask(handler, { abortSignal: stop.signal });
    await vi.advanceTimersByTimeAsync(0);
    addTask(state.doc, task("new-task", ["new-model"]));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(capabilities).toHaveBeenCalledOnce();
    expect(handler).not.toHaveBeenCalled();
    capabilities.mockResolvedValue(["new-model"]);
    changes.dispatchEvent(new Event("change"));
    await running;
    expect(handler).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    changes.dispatchEvent(new Event("change"));
    expect(capabilities).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
  it("retries failed discovery and stops retrying after recovery", async () => {
    vi.useFakeTimers();
    const capabilities = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(["model"]);
    const stop = new AbortController();
    const queue = new TaskQueue("model-do-generate", {
      ...config,
      capabilities,
    });
    const running = queue.handleTask(vi.fn(), { abortSignal: stop.signal });
    await vi.advanceTimersByTimeAsync(999);
    expect(capabilities).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(capabilities).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(capabilities).toHaveBeenCalledTimes(2);
    stop.abort();
    await running;
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
  it("aborts an in-flight capability refresh without claiming a task", async () => {
    addTask(state.doc, task("waiting", ["model"]));
    const stop = new AbortController();
    const capabilities = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string[]>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const queue = new TaskQueue("model-do-generate", {
      ...config,
      capabilities,
    });
    const handler = vi.fn();
    const running = queue.handleTask(handler, { abortSignal: stop.signal });
    stop.abort();
    await running;
    expect(handler).not.toHaveBeenCalled();
    expect(getTaskQueue(state.doc).tasks.get(0).state).toBe("pending");
    state.doc.destroy();
  });
  it("claims work, returns results and removes per-task observers", async () => {
    addTask(state.doc, task());
    const queue = new TaskQueue("model-do-generate", config);
    const controller = new AbortController();
    const { tasks } = getTaskQueue(state.doc);
    const unobserve = vi.spyOn(tasks, "unobserve");
    const handler = vi.fn(async (claimed: any) => {
      expect(claimed).toMatchObject({ state: "claimed", claimedBy: "worker" });
      controller.abort();
      return { output: "done" };
    });
    await queue.handleTask(handler as any, { abortSignal: controller.signal });
    expect(tasks.get(0)).toMatchObject({
      state: "finished",
      result: { output: "done" },
    });
    expect(unobserve).toHaveBeenCalledOnce();
    state.doc.destroy();
  });
  it("records handler errors and cleans subscriptions", async () => {
    addTask(state.doc, task());
    const controller = new AbortController();
    const queue = new TaskQueue("model-do-generate", config);
    await queue.handleTask(
      async () => {
        controller.abort();
        throw new Error("failed");
      },
      { abortSignal: controller.signal },
    );
    expect(getTaskQueue(state.doc).tasks.get(0)).toMatchObject({
      state: "error",
      error: "Error: failed",
    });
    state.doc.destroy();
  });
  it("waits for eligible new work, ignores unrelated capabilities and can stop while idle", async () => {
    const queue = new TaskQueue("model-do-generate", config);
    const controller = new AbortController();
    const handler = vi.fn(async () => {
      controller.abort();
      return {} as any;
    });
    const running = queue.handleTask(handler, {
      abortSignal: controller.signal,
    });
    addTask(state.doc, task("unsupported", ["other"]));
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
    addTask(state.doc, task("supported", ["model"]));
    await running;
    expect(handler).toHaveBeenCalledOnce();
    expect(getTaskQueue(state.doc).tasks.get(0).state).toBe("pending");
    const idle = new AbortController();
    const waiting = queue.handleTask(handler, { abortSignal: idle.signal });
    idle.abort();
    await waiting;
    expect(handler).toHaveBeenCalledOnce();
    state.doc.destroy();
  });
  it("forwards replicated abort requests to a running handler", async () => {
    addTask(state.doc, task());
    const queue = new TaskQueue("model-do-generate", config);
    const stop = new AbortController();
    const taskAbort = new AbortController();
    const started = Promise.withResolvers<AbortSignal>();
    const running = queue.handleTask(
      async (_, signal) => {
        started.resolve(signal);
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
        stop.abort();
        return {} as any;
      },
      { abortSignal: stop.signal },
    );
    const signal = await started.promise;
    registerAbortTask(state.doc, "task", taskAbort.signal);
    taskAbort.abort();
    await running;
    expect(signal.aborted).toBe(true);
    expect(getTaskQueue(state.doc).tasks.get(0).state).toBe("aborted");
    expect(getTaskQueue(state.doc).tasks.get(0)).toMatchObject({
      abortingAtISO: expect.any(String),
      abortedAtISO: expect.any(String),
    });
    state.doc.destroy();
  });
  it("does not claim work when already stopped", async () => {
    addTask(state.doc, task());
    const queue = new TaskQueue("model-do-generate", {
      ...config,
      websocketProvider: {} as any,
    });
    const handler = vi.fn();
    await queue.handleTask(handler, { abortSignal: AbortSignal.abort() });
    expect(handler).not.toHaveBeenCalled();
    state.doc.destroy();
  });
});
