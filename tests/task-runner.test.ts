import { beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { runTask } from "../packages/realtime/src/documents/taskQueue/runTask";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { claimTask } from "../packages/realtime/src/documents/taskQueue/claimTask";
import { setTaskDone } from "../packages/realtime/src/documents/taskQueue/setTaskDone";
import { setTaskError } from "../packages/realtime/src/documents/taskQueue/setTaskError";
const state = vi.hoisted(() => ({
  doc: undefined as any,
  synced: vi.fn(),
  disposed: vi.fn(),
}));
vi.mock("@schornio/aibox-realtime/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = state.doc;
    waitForSynced = state.synced;
    [Symbol.asyncDispose] = state.disposed;
  },
}));
// Relative imports within the package resolve to the same module as its exports.
beforeEach(() => {
  state.doc = new Doc();
  state.synced.mockReset().mockResolvedValue(undefined);
  state.disposed.mockReset().mockResolvedValue(undefined);
});
const options = { serverToken: "Worker tests", websocketProvider: {} } as any;
async function submitted() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  return getTaskQueue(state.doc).tasks.get(0);
}
describe("task submission", () => {
  it("returns the worker result, deletes finished tasks and disposes the connection", async () => {
    const result = runTask(
      "model-do-generate",
      { modelIdentifier: "model", options: {} } as any,
      ["GPU"],
      options,
    );
    const task = await submitted();
    expect(task).toMatchObject({
      state: "pending",
      requiredCapabilities: ["GPU"],
      type: "model-do-generate",
    });
    claimTask(state.doc, "worker", "model-do-generate", ["GPU"]);
    setTaskDone(state.doc, task.id, { output: "done" } as any);
    await expect(result).resolves.toEqual({ output: "done" });
    expect(getTaskQueue(state.doc).tasks.length).toBe(0);
    expect(state.disposed).toHaveBeenCalledOnce();
    state.doc.destroy();
  });
  it("rejects failed tasks and disposes the connection", async () => {
    const result = runTask("model-do-generate", {} as any, [], options);
    const handled = expect(result).rejects.toBeUndefined();
    const task = await submitted();
    setTaskError(state.doc, task.id, "failed");
    await handled;
    expect(state.disposed).toHaveBeenCalledOnce();
    state.doc.destroy();
  });
  it("marks cancellation for the worker, rejects acknowledged abort and cleans the listener", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const result = runTask("model-do-generate", {} as any, [], {
      ...options,
      abortSignal: controller.signal,
    });
    const handled = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    const task = await submitted();
    controller.abort();
    expect(getTaskQueue(state.doc).abortRequests.has(task.id)).toBe(true);
    const { tasks } = getTaskQueue(state.doc);
    tasks.delete(0, 1);
    tasks.push([{ ...task, state: "aborted" } as any]);
    await handled;
    expect(remove).toHaveBeenCalled();
    expect(state.disposed).toHaveBeenCalledOnce();
    state.doc.destroy();
  });
  it("stops waiting for file processing even when no worker acknowledges cancellation", async () => {
    const controller = new AbortController();
    const result = runTask("process-file", {} as any, [], {
      ...options,
      abortSignal: controller.signal,
    });
    const handled = expect(result).rejects.toThrow("processing timeout");
    const task = await submitted();
    controller.abort(new Error("processing timeout"));
    await handled;
    expect(getTaskQueue(state.doc).abortRequests.has(task.id)).toBe(true);
    expect(state.disposed).toHaveBeenCalledOnce();
    state.doc.destroy();
  });
  it("rejects cancellation before submission instead of hanging forever", async () => {
    const reason = new Error("cancelled before submission");
    const controller = new AbortController();
    controller.abort(reason);
    await expect(
      runTask("model-do-generate", {} as any, [], {
        ...options,
        abortSignal: controller.signal,
      }),
    ).rejects.toBe(reason);
    expect(getTaskQueue(state.doc).tasks.length).toBe(0);
    state.doc.destroy();
  });
});
