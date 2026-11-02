import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initConfig } from "../packages/service/src/config.ts";
import { runServiceCLI } from "../packages/service/src/cli.ts";
import { control } from "../packages/service/src/control.ts";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawn: vi.fn(),
}));
vi.mock("node:timers/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:timers/promises")>()),
  setTimeout: vi.fn(),
}));
vi.mock("../packages/service/src/control.ts", () => ({ control: vi.fn() }));
vi.mock("../packages/service/src/daemon.ts", () => ({ runDaemon: vi.fn() }));

const directories: string[] = [];
let elapsed: number;
let readyAt: number;
let started: boolean;
let child: ChildProcess;
let output: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  elapsed = 0;
  readyAt = Number.POSITIVE_INFINITY;
  started = false;
  child = Object.assign(new EventEmitter(), {
    exitCode: null,
    signalCode: null,
    unref: vi.fn(),
  }) as unknown as ChildProcess;
  vi.spyOn(Date, "now").mockImplementation(() => elapsed);
  output = vi.spyOn(console, "log").mockImplementation(() => {});
  vi.mocked(spawn).mockImplementation(() => {
    started = true;
    return child;
  });
  // Advance wall time without thousands of polls or a real migration delay.
  vi.mocked(delay).mockImplementation(async <T>(_delay?: number, value?: T) => {
    elapsed += 60_000;
    return value as T;
  });
  vi.mocked(control).mockImplementation(async () => {
    if (!started)
      throw Object.assign(new Error("Not running"), { code: "ENOENT" });
    return {
      pid: 123,
      state: elapsed >= readyAt ? "running" : "starting",
      services: [],
    };
  });
});
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

async function configPath(services: string[], development = false) {
  const directory = await mkdtemp(join(tmpdir(), "service-cli-start-"));
  directories.push(directory);
  const path = join(directory, "config.json");
  await initConfig(path, services);
  if (development) {
    const config = JSON.parse(await readFile(path, "utf8"));
    config.development = { workspace: directory };
    await writeFile(path, JSON.stringify(config));
  }
  return path;
}

it.each([
  { services: ["supabase", "core"], readyAfter: 36 * 60_000 },
  {
    services: ["supabase", "core", "document-extractor"],
    readyAfter: 39 * 60_000,
  },
])(
  "waits for $services to finish after a long database copy",
  async ({ services, readyAfter }) => {
    readyAt = readyAfter;
    await runServiceCLI([
      "service",
      "start",
      "--config",
      await configPath(services),
    ]);
    expect(output).toHaveBeenCalledWith("Service running (PID 123)");
  },
);

it.each([
  { services: ["core"], development: false, deadline: 4 * 60_000 },
  { services: ["supabase"], development: true, deadline: 4 * 60_000 },
  { services: ["supabase"], development: false, deadline: 34 * 60_000 },
  {
    services: ["supabase", "core"],
    development: false,
    deadline: 37 * 60_000,
  },
  {
    services: ["supabase", "core", "document-extractor"],
    development: false,
    deadline: 40 * 60_000,
  },
])(
  "bounds startup for $services (development: $development)",
  async ({ services, development, deadline }) => {
    await expect(
      runServiceCLI([
        "service",
        "start",
        "--config",
        await configPath(services, development),
      ]),
    ).rejects.toThrow("Service startup timed out");
    expect(elapsed).toBe(deadline);
  },
);

it("reports a failed database daemon immediately instead of waiting for the copy allowance", async () => {
  child.exitCode = 1;
  await expect(
    runServiceCLI([
      "service",
      "start",
      "--config",
      await configPath(["supabase"]),
    ]),
  ).rejects.toThrow("Service failed to start");
  expect(elapsed).toBe(0);
});
