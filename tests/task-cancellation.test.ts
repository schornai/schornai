import { describe, expect, it } from "vitest";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
import { TaskCoordinator } from "../packages/realtime/src/documents/taskQueue/TaskCoordinator";
import { taskClaimStore } from "./helpers/task-claims";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { requestTaskAbort } from "../packages/realtime/src/documents/taskQueue/requestTaskAbort";
const task = {
  id: "task",
  type: "chat",
  state: "pending",
  requiredCapabilities: [],
  parameters: {
    activityId: "activity",
    agentId: "agent",
    userId: "user",
    userClaims: [],
  },
} as const;
function fixture() {
  const worker = new Doc(),
    requester = new Doc();
  addTask(worker, {
    ...task,
    requiredCapabilities: [],
    parameters: { ...task.parameters, userClaims: [] },
  });
  const coordinator = new TaskCoordinator(
    worker,
    taskClaimStore().options,
    async () => {},
  );
  return { worker, requester, coordinator };
}
function merge(a: Doc, b: Doc) {
  const left = encodeStateAsUpdate(a),
    right = encodeStateAsUpdate(b);
  applyUpdate(a, right);
  applyUpdate(b, left);
}
describe("replicated cancellation", () => {
  it.each(["cancel-first", "finish-first"])(
    "concurrent completion and %s leave one terminal task",
    async (order) => {
      const { worker, requester, coordinator } = fixture();
      const claimed = (await coordinator.claim("chat", [], "worker"))!;
      applyUpdate(requester, encodeStateAsUpdate(worker));
      if (order === "cancel-first") {
        requestTaskAbort(requester, "task");
        await coordinator.finish("task", claimed.claimToken, undefined);
      } else {
        await coordinator.finish("task", claimed.claimToken, undefined);
        requestTaskAbort(requester, "task");
      }
      merge(worker, requester);
      for (const doc of [worker, requester]) {
        expect(getTaskQueue(doc).tasks.toArray()).toMatchObject([
          { id: "task", state: "finished" },
        ]);
        expect(getTaskQueue(doc).tasks.length).toBe(1);
        doc.destroy();
      }
    },
  );
  it("acknowledges cancellation received before completion with abort timestamps", async () => {
    const { worker, requester, coordinator } = fixture();
    const claimed = (await coordinator.claim("chat", [], "worker"))!;
    applyUpdate(requester, encodeStateAsUpdate(worker));
    requestTaskAbort(requester, "task");
    applyUpdate(worker, encodeStateAsUpdate(requester));
    await coordinator.finish("task", claimed.claimToken, undefined);
    merge(worker, requester);
    expect(getTaskQueue(requester).tasks.toArray()).toMatchObject([
      {
        state: "aborted",
        abortingAtISO: expect.any(String),
        abortedAtISO: expect.any(String),
      },
    ]);
    worker.destroy();
    requester.destroy();
  });
  it("never starts a pending task with a replicated cancellation request", async () => {
    const { worker, requester, coordinator } = fixture();
    applyUpdate(requester, encodeStateAsUpdate(worker));
    requestTaskAbort(requester, "task");
    applyUpdate(worker, encodeStateAsUpdate(requester));
    expect(await coordinator.claim("chat", [], "worker")).toBeUndefined();
    expect(getTaskQueue(worker).tasks.get(0).state).toBe("aborted");
    worker.destroy();
    requester.destroy();
  });
});
