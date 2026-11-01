import { mkdtemp, mkdir, rm, realpath } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import { stopLegacyTranscriber } from "../packages/service/src/stopLegacyTranscriber.ts";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");
  return {
    execFile: Object.assign(() => {}, { [promisify.custom]: mocks.execute }),
  };
});
const directories: string[] = [];
afterEach(async () => {
  mocks.execute.mockReset();
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

it.runIf(process.platform === "darwin")(
  "stops only the old Node worker owned by this user in this installation's directory",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "service-old-worker-"));
    directories.push(root);
    const cwd = join(root, "apps/transcriber-mac");
    await mkdir(cwd, { recursive: true });
    const resolvedCwd = await realpath(cwd);
    mocks.execute.mockImplementation(
      async (command: string, args: string[]) => {
        if (command === "/usr/sbin/lsof") {
          expect(args).toEqual([
            "-a",
            "-u",
            String(process.getuid!()),
            "-d",
            "cwd",
            "-F",
            "pn",
            "--",
            resolvedCwd,
          ]);
          return { stdout: "p101\np102\np103\n" };
        }
        return {
          stdout:
            args[1] === "101"
              ? "/opt/node appTranscriberMac.js\n"
              : args[1] === "102"
                ? "node another-worker.js\n"
                : "bash\n",
        };
      },
    );
    const kill = vi
      .spyOn(process, "kill")
      .mockImplementation((_pid, signal) => {
        if (signal === 0)
          throw Object.assign(new Error("Exited"), { code: "ESRCH" });
        return true;
      });
    await stopLegacyTranscriber(root, vi.fn());
    expect(kill.mock.calls).toEqual([
      [101, "SIGTERM"],
      [101, 0],
    ]);
  },
);

it("does nothing when this installation has no old transcriber", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-no-worker-"));
  directories.push(root);
  const kill = vi.spyOn(process, "kill");
  await stopLegacyTranscriber(root, vi.fn());
  expect(mocks.execute).not.toHaveBeenCalled();
  expect(kill).not.toHaveBeenCalled();
});
