import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Doc } from "yjs";
import { handleClaimedTask } from "../packages/realtime/src/documents/taskQueue/handleClaimedTask";
import { requestTaskCoordinator } from "../packages/realtime/src/documents/taskQueue/requestTaskCoordinator";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
let document: Doc;
let provider: any;
let commands: any[];
let acceptRenewal: boolean;
const task: any = {
  id: "task",
  state: "claimed",
  claimToken: crypto.randomUUID(),
  type: "model-do-generate",
  parameters: { modelId: "model" },
  requiredCapabilities: [],
};
beforeEach(() => {
  vi.useFakeTimers();
  document = new Doc();
  getTaskQueue(document).tasks.push([task]);
  commands = [];
  acceptRenewal = true;
  provider = Object.assign(new EventEmitter(), {
    sendStateless: vi.fn((payload: string) => {
      const command = JSON.parse(payload);
      commands.push(command);
      provider.emit("stateless", {
        payload: JSON.stringify({
          protocol: command.protocol,
          requestId: command.requestId,
          ok: true,
          accepted: command.action === "renew" ? acceptRenewal : true,
        }),
      });
    }),
  });
});
afterEach(() => {
  document.destroy();
  vi.useRealTimers();
});
it("keeps a long-running handler's lease alive and cleans heartbeat listeners after completion", async () => {
  const finish = Promise.withResolvers<void>();
  const running = handleClaimedTask(
    document,
    provider,
    task,
    () => finish.promise,
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(60_000);
  expect(commands.map((command) => command.action)).toEqual([
    "renew",
    "renew",
    "renew",
  ]);
  finish.resolve();
  await running;
  expect(commands.at(-1).action).toBe("finish");
  expect(provider.eventNames()).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
});
it.each(["close", "destroy", "renewal"])(
  "aborts a handler on %s loss without submitting its late result",
  async (loss) => {
    const started = Promise.withResolvers<AbortSignal>();
    const running = handleClaimedTask(
      document,
      provider,
      task,
      async (_, signal) => {
        started.resolve(signal);
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
        return {} as any;
      },
      new AbortController().signal,
    );
    const signal = await started.promise;
    if (loss === "renewal") {
      acceptRenewal = false;
      await vi.advanceTimersByTimeAsync(20_000);
    } else provider.emit(loss);
    await running;
    expect(signal.reason.message).toBe("TASK_LEASE_LOST");
    expect(commands.some((command) => command.action === "finish")).toBe(false);
    expect(provider.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("rejects a disconnected coordinator request and ignores unrelated responses", async () => {
  provider.sendStateless.mockImplementation(() => {});
  const waiting = requestTaskCoordinator(provider, {
    action: "renew",
    taskId: "task",
    token: task.claimToken,
  });
  const rejected = expect(waiting).rejects.toThrow(
    "TASK_COORDINATOR_DISCONNECTED",
  );
  provider.emit("stateless", { payload: "unrelated" });
  provider.emit("close");
  await rejected;
  expect(provider.eventNames()).toEqual([]);
});
