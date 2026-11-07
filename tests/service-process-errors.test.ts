import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { expect, it, vi } from "vitest";
import { completion, terminate } from "../packages/service/src/process";
it.each(["close", "exit"] as const)(
  "rejects a nonzero %s status or termination signal",
  async (event) => {
    for (const [code, signal, expected] of [
      [7, null, "7"],
      [null, "SIGTERM", "SIGTERM"],
    ] as const) {
      const child = new EventEmitter() as ChildProcess;
      const done = completion(child, event);
      child.emit(event, code, signal);
      await expect(done).rejects.toThrow(expected);
    }
  },
);
it("propagates spawn errors before the process emits an exit event", async () => {
  const child = new EventEmitter() as ChildProcess;
  const done = completion(child);
  const failure = Object.assign(new Error("missing executable"), {
    code: "ENOENT",
  });
  child.emit("error", failure);
  await expect(done).rejects.toBe(failure);
});
it("does not signal a process that never acquired a PID", async () => {
  const kill = vi.spyOn(process, "kill").mockReturnValue(true);
  await terminate({} as ChildProcess);
  expect(kill).not.toHaveBeenCalled();
});
it.each(["SIGTERM", "probe"])(
  "propagates permission errors during %s instead of treating them as an exited process",
  async (stage) => {
    const failure = Object.assign(new Error("denied"), { code: "EPERM" });
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw failure;
    });
    if (stage === "probe") kill.mockReturnValueOnce(true);
    await expect(terminate({ pid: 12345 } as ChildProcess)).rejects.toBe(
      failure,
    );
    expect(kill.mock.calls).toEqual(
      stage === "probe"
        ? [
            [-12345, "SIGTERM"],
            [-12345, 0],
          ]
        : [[-12345, "SIGTERM"]],
    );
  },
);
it("tolerates an already-vanished process group", async () => {
  const kill = vi.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error("gone"), { code: "ESRCH" });
  });
  await expect(
    terminate({ pid: 12345 } as ChildProcess),
  ).resolves.toBeUndefined();
  expect(kill.mock.calls).toEqual([
    [-12345, "SIGTERM"],
    [-12345, 0],
  ]);
});
