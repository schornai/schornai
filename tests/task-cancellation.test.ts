import { describe, expect, it } from "vitest";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
import { claimTask } from "../packages/realtime/src/documents/taskQueue/claimTask";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { requestTaskAbort } from "../packages/realtime/src/documents/taskQueue/requestTaskAbort";
import { setTaskDone } from "../packages/realtime/src/documents/taskQueue/setTaskDone";
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
  return { worker, requester };
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
    (order) => {
      const { worker, requester } = fixture();
      claimTask(worker, "worker", "chat", []);
      applyUpdate(requester, encodeStateAsUpdate(worker));
      if (order === "cancel-first") {
        requestTaskAbort(requester, "task");
        setTaskDone(worker, "task", undefined);
      } else {
        setTaskDone(worker, "task", undefined);
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
  it("acknowledges cancellation received before completion with abort timestamps", () => {
    const { worker, requester } = fixture();
    claimTask(worker, "worker", "chat", []);
    applyUpdate(requester, encodeStateAsUpdate(worker));
    requestTaskAbort(requester, "task");
    applyUpdate(worker, encodeStateAsUpdate(requester));
    setTaskDone(worker, "task", undefined);
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
  it("never starts a pending task with a replicated cancellation request", () => {
    const { worker, requester } = fixture();
    applyUpdate(requester, encodeStateAsUpdate(worker));
    requestTaskAbort(requester, "task");
    applyUpdate(worker, encodeStateAsUpdate(requester));
    expect(claimTask(worker, "worker", "chat", [])).toBeUndefined();
    expect(getTaskQueue(worker).tasks.get(0).state).toBe("aborted");
    worker.destroy();
    requester.destroy();
  });
});
