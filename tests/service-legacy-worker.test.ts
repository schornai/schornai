import { mkdtemp, mkdir, rm, realpath, writeFile } from "node:fs/promises";
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

it("stops only the old Node worker owned by this user in this installation's directory", async () => {
  vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  const root = await mkdtemp(join(tmpdir(), "service-old-worker-"));
  directories.push(root);
  const cwd = join(root, "apps/transcriber-mac");
  await mkdir(cwd, { recursive: true });
  const resolvedCwd = await realpath(cwd);
  mocks.execute.mockImplementation(async (command: string, args: string[]) => {
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
  });
  const kill = vi.spyOn(process, "kill").mockImplementation((_pid, signal) => {
    if (signal === 0)
      throw Object.assign(new Error("Exited"), { code: "ESRCH" });
    return true;
  });
  await stopLegacyTranscriber(root, vi.fn());
  expect(kill.mock.calls).toEqual([
    [101, "SIGTERM"],
    [101, 0],
  ]);
});

it("does nothing when this installation has no old transcriber", async () => {
  vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  const root = await mkdtemp(join(tmpdir(), "service-no-worker-"));
  directories.push(root);
  const kill = vi.spyOn(process, "kill");
  await stopLegacyTranscriber(root, vi.fn());
  expect(mocks.execute).not.toHaveBeenCalled();
  expect(kill).not.toHaveBeenCalled();
});

it("does not inspect or signal workers on other platforms", async () => {
  vi.spyOn(process, "platform", "get").mockReturnValue("linux");
  const kill = vi.spyOn(process, "kill").mockReturnValue(true);
  await stopLegacyTranscriber("/unused", vi.fn());
  expect(mocks.execute).not.toHaveBeenCalled();
  expect(kill).not.toHaveBeenCalled();
});

it.each([
  "none",
  "lookup-error",
  "process-gone",
  "signal-denied",
  "probe-denied",
  "timeout",
  "ps-error",
])(
  "handles legacy worker detection and stop failures (%s)",
  async (failure) => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    const root = await mkdtemp(join(tmpdir(), "legacy-stop-failure-"));
    directories.push(root);
    await mkdir(join(root, "apps/transcriber-mac"), { recursive: true });
    mocks.execute.mockImplementation(async (command) => {
      if (command === "/usr/sbin/lsof") {
        if (failure === "none" || failure === "lookup-error")
          throw Object.assign(new Error("lookup failed"), {
            code: failure === "none" ? 1 : 2,
          });
        return { stdout: "p101\n" };
      }
      if (failure === "ps-error") throw new Error("process disappeared");
      return { stdout: "node appTranscriberMac.js\n" };
    });
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const kill = vi
      .spyOn(process, "kill")
      .mockImplementation((_pid, signal) => {
        if (failure === "process-gone")
          throw Object.assign(new Error("gone"), { code: "ESRCH" });
        if (
          failure === "signal-denied" ||
          (failure === "probe-denied" && signal === 0)
        )
          throw Object.assign(new Error("denied"), { code: "EPERM" });
        if (signal === 0) now += 15_001;
        return true;
      });
    const result = stopLegacyTranscriber(root, vi.fn());
    if (["none", "process-gone", "ps-error"].includes(failure))
      await expect(result).resolves.toBeUndefined();
    else
      await expect(result).rejects.toThrow(
        failure === "timeout"
          ? "Legacy transcriber did not stop"
          : failure === "lookup-error"
            ? "lookup failed"
            : "denied",
      );
    if (["none", "lookup-error", "ps-error"].includes(failure))
      expect(kill).not.toHaveBeenCalled();
  },
);

it("does not treat an invalid installation directory as a missing worker", async () => {
  vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  const root = await mkdtemp(join(tmpdir(), "legacy-layout-error-"));
  directories.push(root);
  await writeFile(join(root, "apps"), "not a directory");
  await expect(stopLegacyTranscriber(root, vi.fn())).rejects.toMatchObject({
    code: "ENOTDIR",
  });
  expect(mocks.execute).not.toHaveBeenCalled();
});
