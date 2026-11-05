import { afterEach, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { mkdtemp, symlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runCLI } from "../apps/cli/bin/schornai.js";

const originalArgs = process.argv;
const originalExitCode = process.exitCode;
afterEach(() => {
  process.argv = originalArgs;
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});
it("lazily loads the installation entrypoint without arguments and forwards service arguments intact", async () => {
  const runDefaultCLI = vi.fn();
  const runServiceCLI = vi.fn();
  const load = vi.fn(async () => ({ runDefaultCLI, runServiceCLI }));
  await runCLI([], load);
  expect(load).toHaveBeenLastCalledWith("bootstrap.mjs");
  expect(runDefaultCLI).toHaveBeenCalledOnce();
  const args = [
    "service",
    "status",
    "--config",
    "/tmp/example config.json",
    "--json",
  ];
  await runCLI(args, load);
  expect(load).toHaveBeenLastCalledWith("commands.mjs");
  expect(runServiceCLI).toHaveBeenCalledWith(args);
});
it.each(["--help", "-h", "--version"])(
  "serves %s without loading the machine service",
  async (argument) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const load = vi.fn();
    await runCLI([argument], load);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        argument === "--version" ? "0.5.0" : "schornai service",
      ),
    );
    expect(load).not.toHaveBeenCalled();
  },
);
it("propagates a service bootstrap failure to the command entrypoint", async () => {
  const failure = new Error("runtime unavailable");
  await expect(
    runCLI([], async () => {
      throw failure;
    }),
  ).rejects.toBe(failure);
});
it("reports unknown direct commands with a failing exit status", async () => {
  vi.resetModules();
  process.argv = [
    process.execPath,
    fileURLToPath(new URL("../apps/cli/bin/schornai.js", import.meta.url)),
    "unknown",
  ];
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  await import("../apps/cli/bin/schornai.js");
  expect(process.exitCode).toBe(1);
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining("Unknown command: unknown"),
  );
});

it("runs the npm-style executable symlink as the command entrypoint", async () => {
  const root = await mkdtemp(join(tmpdir(), "cli-symlink-"));
  try {
    const command = join(root, "schornai");
    await symlink(
      fileURLToPath(new URL("../apps/cli/bin/schornai.js", import.meta.url)),
      command,
    );
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [
      command,
      "--help",
    ]);
    expect(stdout).toContain("schornai service --help");
    expect(stderr).toBe("");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
