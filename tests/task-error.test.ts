import { expect, it } from "vitest";
import { Doc } from "yjs";
import type { Task } from "../packages/realtime/src/documents/taskQueue/_types.ts";
import { setTaskError } from "../packages/realtime/src/documents/taskQueue/setTaskError.ts";

it.each(["pending", "claimed", "finished", "aborting", "aborted"] as const)(
  "retains the original %s state and metadata across repeated failures",
  (state) => {
    const doc = new Doc();
    const task: Task = {
      id: "task",
      type: "chat",
      requiredCapabilities: [],
      parameters: {
        agentId: "agent",
        activityId: "activity",
        userId: "user",
        userClaims: [],
      },
      claimedBy: "worker",
      claimedAtISO: "2026-01-01T00:00:00Z",
      finishedAtISO: "2026-01-01T00:00:01Z",
      abortingAtISO: "2026-01-01T00:00:01Z",
      abortedAtISO: "2026-01-01T00:00:02Z",
      state,
    };
    const tasks = doc.getArray<Task>("tasks");
    tasks.push([task]);
    setTaskError(doc, task.id, new Error("first failure"));
    expect(tasks.get(0)).toEqual({
      ...task,
      state: "error",
      stateBeforeError: state,
      error: "Error: first failure",
    });
    setTaskError(doc, task.id, "second failure");
    expect(tasks.get(0)).toEqual({
      ...task,
      state: "error",
      stateBeforeError: state,
      error: "second failure",
    });
    doc.destroy();
  },
);
