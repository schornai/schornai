import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
  appendFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runServiceCLI } from "../packages/service/src/cli.ts";
import { control } from "../packages/service/src/control.ts";
import { runDaemon } from "../packages/service/src/daemon.ts";
import { setupInitialAdmin } from "../packages/service/src/initialAdmin.ts";

vi.mock("../packages/service/src/control.ts", () => ({ control: vi.fn() }));
vi.mock("../packages/service/src/daemon.ts", () => ({ runDaemon: vi.fn() }));
vi.mock("../packages/service/src/initialAdmin.ts", () => ({
  setupInitialAdmin: vi.fn(),
}));
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn() }));

let root: string;
let path: string;
let output: ReturnType<typeof vi.spyOn>;
const running = { state: "running" as const, pid: 42, services: ["core"] };
const stopped = () => Object.assign(new Error("offline"), { code: "ENOENT" });
const entry = (message: string) =>
  JSON.stringify({ timestampISO: "today", sender: "test", message });
const call = (...args: string[]) =>
  runServiceCLI(["service", ...args, "--config", path]);
beforeEach(async () => {
  vi.resetAllMocks();
  root = await mkdtemp(join(tmpdir(), "service-cli-commands-"));
  path = join(root, "config.json");
  output = vi.spyOn(console, "log").mockImplementation(() => {});
  vi.mocked(control).mockResolvedValue(running);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("shows help without loading a configuration and rejects invalid command forms", async () => {
  await runServiceCLI([]);
  await runServiceCLI(["--help"]);
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining("Usage: schornai service"),
  );
  for (const args of [
    ["other", "start"],
    ["service"],
    ["service", "start", "extra"],
    ["service", "unknown"],
  ])
    await expect(runServiceCLI(args)).rejects.toThrow("Usage:");
  expect(control).not.toHaveBeenCalled();
});

it("creates only the selected initial roles and refuses overwriting an existing configuration", async () => {
  await call("init", "--services", "core,,document-extractor");
  expect(JSON.parse(await readFile(path, "utf8")).services).toEqual([
    "core",
    "document-extractor",
  ]);
  await expect(call("init")).rejects.toMatchObject({ code: "EEXIST" });
  await call("setup-admin");
  expect(setupInitialAdmin).toHaveBeenCalledWith(
    expect.objectContaining({ configPath: path }),
  );
});

it("uses the environment config path for foreground startup and SCHORNAI_HOME for its default", async () => {
  vi.stubEnv("SCHORNAI_CONFIG", path);
  await runServiceCLI(["service", "run"]);
  expect(runDaemon).toHaveBeenLastCalledWith(path);
  vi.stubEnv("SCHORNAI_CONFIG", undefined);
  vi.stubEnv("SCHORNAI_HOME", root);
  await runServiceCLI(["service", "run"]);
  expect(runDaemon).toHaveBeenLastCalledWith(path);
  await runServiceCLI(["service", "init"]);
  expect(JSON.parse(await readFile(path, "utf8")).services).toEqual([]);
});

it("reports live and stopped status in human and machine formats", async () => {
  await call("status");
  expect(output).toHaveBeenLastCalledWith("running (PID 42): core");
  await call("status", "--json");
  expect(JSON.parse(output.mock.calls.at(-1)![0])).toEqual(running);
  vi.mocked(control).mockRejectedValue(stopped());
  await call("status");
  expect(output).toHaveBeenLastCalledWith("stopped");
  await call("status", "--json");
  expect(JSON.parse(output.mock.calls.at(-1)![0])).toEqual({
    state: "stopped",
    services: [],
  });
});

it.each(["ENOENT", "ECONNREFUSED", "EPIPE", "ECONNRESET"])(
  "treats %s as a stopped service",
  async (code) => {
    vi.mocked(control).mockRejectedValue(
      Object.assign(new Error("offline"), { code }),
    );
    await call("status");
    expect(output).toHaveBeenLastCalledWith("stopped");
  },
);

it.each([
  new Error("denied"),
  Object.assign(new Error("denied"), { code: "EACCES" }),
])("propagates control errors that do not mean stopped", async (error) => {
  vi.mocked(control).mockRejectedValue(error);
  await expect(call("status")).rejects.toBe(error);
});

it("requests synchronization only when running and reports queued state", async () => {
  await call("sync");
  expect(control).toHaveBeenLastCalledWith(root, "sync");
  expect(output).toHaveBeenLastCalledWith(
    expect.stringContaining("Synchronization requested"),
  );
  await call("sync", "--json");
  expect(JSON.parse(output.mock.calls.at(-1)![0])).toEqual({
    ...running,
    sync: "queued",
  });
  vi.mocked(control).mockRejectedValue(stopped());
  await expect(call("sync")).rejects.toThrow("start it before syncing");
});

it("waits for confirmed shutdown and permits repeated stop without a daemon", async () => {
  vi.mocked(control)
    .mockResolvedValueOnce(running)
    .mockResolvedValueOnce(running)
    .mockResolvedValueOnce(running)
    .mockRejectedValue(stopped());
  await call("stop");
  expect(control).toHaveBeenCalledWith(root, "stop");
  expect(delay).toHaveBeenCalledWith(250);
  expect(output).toHaveBeenLastCalledWith("Service stopped");
  await call("stop");
});

it("bounds a daemon that never acknowledges stop and avoids launching an already running service", async () => {
  vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(120_001);
  await expect(call("stop")).rejects.toThrow("Stop timed out");
  await call("start");
  expect(output).toHaveBeenLastCalledWith("Service already running");
});

it.each(["0", "10001", "1.5", "NaN"])(
  "rejects invalid log line limits (%s)",
  async (value) => {
    await expect(call("logs", "--lines", value)).rejects.toThrow(
      "--lines must be between",
    );
  },
);

it("tails bounded complete log records, skipping malformed text and preserving raw JSON when requested", async () => {
  await mkdir(join(root, "logs"));
  await writeFile(
    join(root, "logs/service.log"),
    `${entry("old")}\nmalformed\n\n${entry("latest")}\npartial`,
  );
  await call("logs", "--lines", "3");
  expect(output.mock.calls).toEqual([["today [test] latest"]]);
  output.mockClear();
  await call("logs", "--json");
  expect(output.mock.calls.map(([value]) => value)).toEqual([
    entry("old"),
    "malformed",
    entry("latest"),
  ]);
});

it("allows missing logs while surfacing other file errors", async () => {
  await call("logs");
  expect(output).not.toHaveBeenCalled();
  await mkdir(join(root, "logs"));
  await mkdir(join(root, "logs/service.log"));
  await expect(call("logs")).rejects.toThrow();
});

it("follows appended partial records and handles rotation and truncation without replaying old records", async () => {
  await mkdir(join(root, "logs"));
  const file = join(root, "logs/service.log");
  const second = entry("appended");
  await writeFile(file, `${entry("first")}\n${second.slice(0, 10)}`);
  const stop = new Error("stop following");
  vi.mocked(delay)
    .mockImplementationOnce(async () => {
      await appendFile(file, `${second.slice(10)}\n`);
    })
    .mockImplementationOnce(async () => {
      await rename(file, `${file}.1`);
      await writeFile(file, `${entry("rotated")}\n`);
    })
    .mockImplementationOnce(async () => {
      await writeFile(file, `${entry("new")}\n`);
    })
    .mockRejectedValueOnce(stop);
  await expect(call("logs", "--follow")).rejects.toBe(stop);
  expect(output.mock.calls.map(([value]) => value)).toEqual([
    "today [test] first",
    "today [test] appended",
    "today [test] rotated",
    "today [test] new",
  ]);
});
