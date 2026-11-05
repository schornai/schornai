import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
import type { ChildProcess } from "node:child_process";
import type { Context } from "../packages/service/src/config.ts";
import { configSchema } from "../packages/service/src/config.ts";
import { Services } from "../packages/service/src/services.ts";
import { ensureDocker } from "../packages/service/src/docker.ts";
import {
  run,
  launch,
  completion,
  terminate,
} from "../packages/service/src/process.ts";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const processCommands = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("node:child_process", async (original) => {
  const { promisify } = await import("node:util");
  return {
    ...(await original<typeof import("node:child_process")>()),
    execFile: Object.assign(() => {}, {
      [promisify.custom]: processCommands.execute,
    }),
  };
});
vi.mock("../packages/service/src/process.ts", () => ({
  run: vi.fn(),
  launch: vi.fn(() => new EventEmitter()),
  completion: vi.fn(
    (child: ChildProcess, event: string = "close") =>
      new Promise<void>((resolve) => child.once(event, () => resolve())),
  ),
  terminate: vi.fn(async (child: ChildProcess) => {
    child.emit("exit", 0);
    child.emit("close", 0);
  }),
}));
const context: Context = {
  root: "/test-service-docker",
  configPath: "/test-service-docker/config.json",
  environment: {},
  config: configSchema.parse({
    version: 1,
    id: "00000000-0000-4000-8000-000000000001",
    services: ["supabase"],
    docker: { manageColima: true },
  }),
};
beforeEach(() => {
  processCommands.execute.mockReset();
  vi.mocked(run).mockReset();
  vi.mocked(launch).mockClear();
  vi.mocked(terminate).mockClear();
});

it.each(["array", "lines"])(
  "reports Compose container states and health from %s output",
  async (format) => {
    const rows = [
      { Service: "db", State: "running", Health: "healthy" },
      { Service: "retrying", State: "restarting", Health: "unhealthy" },
      { Service: "new", State: "created", Health: "starting" },
      { Service: "finished", State: "exited" },
      { Service: "failed", State: "dead", Health: "" },
      { Service: "other", State: "paused", Health: "unsupported" },
    ];
    processCommands.execute.mockResolvedValue({
      stdout:
        format === "array"
          ? JSON.stringify(rows)
          : rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
      stderr: "",
    });
    const services = new Services(context, vi.fn());
    try {
      await services.start();
      expect(await services.status()).toEqual([
        { name: "supabase:db", state: "running", health: "healthy" },
        { name: "supabase:retrying", state: "restarting", health: "unhealthy" },
        { name: "supabase:new", state: "starting", health: "starting" },
        { name: "supabase:finished", state: "stopped" },
        { name: "supabase:failed", state: "stopped" },
        { name: "supabase:other", state: "unknown" },
      ]);
      expect(processCommands.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(["ps", "--all", "--format", "json"]),
        expect.objectContaining({ timeout: 3000 }),
      );
    } finally {
      await services.stop();
    }
  },
);

it.each(["invalid json", undefined])(
  "reports unknown state when Compose status is unreadable",
  async (stdout) => {
    if (stdout)
      processCommands.execute.mockResolvedValue({ stdout, stderr: "" });
    else
      processCommands.execute.mockRejectedValue(
        new Error("Docker unavailable"),
      );
    const services = new Services(context, vi.fn());
    try {
      await services.start();
      expect(await services.status()).toEqual([
        { name: "supabase", state: "unknown" },
      ]);
    } finally {
      await services.stop();
    }
  },
);

it("reports local Supabase availability without logging its credentials", async () => {
  const logs = vi.fn();
  const services = new Services(
    {
      ...context,
      config: {
        ...context.config,
        development: { workspace: "/test-checkout" },
      },
    },
    logs,
  );
  processCommands.execute.mockResolvedValue({
    stdout: "secret cli output",
    stderr: "",
  });
  try {
    await services.start();
    expect(await services.status()).toEqual([
      { name: "supabase", state: "running" },
    ]);
    processCommands.execute.mockRejectedValue(new Error("offline"));
    expect(await services.status()).toEqual([
      { name: "supabase", state: "error" },
    ]);
    expect(JSON.stringify(logs.mock.calls)).not.toContain("secret cli output");
  } finally {
    await services.stop();
  }
});

it("reports shutdown failures after attempting to stop all owned services", async () => {
  const services = new Services(context, vi.fn());
  await services.start();
  vi.mocked(run).mockImplementation(async (command) => {
    if (command.args.includes("stop")) throw new Error("stop failed");
  });
  await expect(services.stop()).rejects.toThrow(
    "Some services could not be stopped",
  );
  expect(await services.status()).toEqual([]);
  await services.stop();
});
it("preserves ownership of a started Colima VM across an update pause and stops it on shutdown", async () => {
  vi.mocked(run).mockRejectedValueOnce(new Error("Docker is offline"));
  const services = new Services(context, () => {});
  await services.start();
  await services.stop({ keepDocker: true });
  expect(
    vi
      .mocked(run)
      .mock.calls.filter(([command]) => command.name === "colima")
      .map(([command]) => command.args),
  ).toEqual([["start", "--memory", "8"]]);
  services.reconfigure(context);
  await services.start();
  await services.stop();
  expect(
    vi.mocked(completion).mock.calls.every(([, event]) => event === "exit"),
  ).toBe(true);
  expect(
    vi.mocked(terminate).mock.calls.every((args) => args.length === 1),
  ).toBe(true);
  expect(
    vi
      .mocked(run)
      .mock.calls.filter(([command]) => command.name === "colima")
      .map(([command]) => command.args),
  ).toEqual([["start", "--memory", "8"], ["stop"]]);
});
it("does not claim or stop an already available Docker VM", async () => {
  const services = new Services(context, () => {});
  await services.start();
  await services.stop();
  expect(
    vi.mocked(run).mock.calls.some(([command]) => command.name === "colima"),
  ).toBe(false);
});
it("allows the installed Supabase copy window while retaining shorter waits for other stacks", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-start-budget-"));
  const services = new Services(
    {
      ...context,
      root,
      config: {
        ...context.config,
        services: ["supabase", "document-extractor", "core"],
      },
    },
    () => {},
  );
  try {
    await services.start();
    const starts = vi
      .mocked(run)
      .mock.calls.map(([command]) => command)
      .filter((command) => command.args.includes("up"));
    expect(
      starts.map((command) => [
        command.name,
        command.args[command.args.indexOf("--wait-timeout") + 1],
      ]),
    ).toEqual([
      ["supabase", "1800"],
      ["document-extractor", "180"],
      ["core", "180"],
    ]);
  } finally {
    await services.stop();
    await rm(root, { recursive: true, force: true });
  }
});
it("follows database logs while startup is pending and cleans the follower up on failure", async () => {
  const log = vi.fn();
  let failStartup!: (error: Error) => void;
  vi.mocked(run).mockImplementation(async (command) => {
    if (command.name === "supabase" && command.args.includes("up"))
      await new Promise<void>((_resolve, reject) => {
        failStartup = reject;
      });
  });
  const services = new Services(context, log);
  const startup = services.start();
  const failed = expect(startup).rejects.toThrow("Database copy failed");
  await expect.poll(() => failStartup).toBeTypeOf("function");
  expect(launch).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "supabase:logs",
      args: expect.arrayContaining(["logs", "--follow", "--tail", "100"]),
    }),
    log,
  );
  const follower = vi.mocked(launch).mock.results[0]!.value;
  // The process transport can already deliver copy progress before `up --wait` returns.
  vi.mocked(launch).mock.calls[0]![1]("supabase:logs", "Copying database");
  expect(log).toHaveBeenCalledWith("supabase:logs", "Copying database");
  failStartup(new Error("Database copy failed"));
  await failed;
  expect(terminate).toHaveBeenCalledWith(follower);
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "supabase",
      args: expect.arrayContaining(["stop", "--timeout", "30"]),
    }),
    log,
  );
  expect(await services.status()).toEqual([]);
});

it("reattaches an early log follower after Compose creates containers without failing startup", async () => {
  let finishStartup!: () => void;
  vi.mocked(run).mockImplementation(async (command) => {
    if (command.name === "supabase" && command.args.includes("up"))
      await new Promise<void>((resolve) => {
        finishStartup = resolve;
      });
  });
  const services = new Services(context, vi.fn());
  const startup = services.start();
  try {
    await expect.poll(() => finishStartup).toBeTypeOf("function");
    const initialFollower = vi.mocked(launch).mock.results[0]!.value;
    initialFollower.emit("exit", 0);
    await expect
      .poll(() => vi.mocked(launch).mock.calls.length, { timeout: 5000 })
      .toBe(2);
    expect(terminate).toHaveBeenCalledWith(initialFollower);
    finishStartup();
    await startup;
  } finally {
    finishStartup?.();
    await services.stop();
    await startup;
  }
});
it("keeps the web app reachable when database migrations fail", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-web-start-"));
  vi.mocked(run).mockImplementation(async (command) => {
    if (command.args.includes("migrate")) throw new Error("Migration failed");
    if (command.name === "core" && command.args.includes("up"))
      expect(
        (await stat(join(root, "ollama/models/manifests"))).isDirectory(),
      ).toBe(true);
  });
  const log = vi.fn();
  const services = new Services(
    {
      ...context,
      root,
      config: { ...context.config, services: ["supabase", "core"] },
    },
    log,
  );
  try {
    await services.start();
    expect(
      vi
        .mocked(run)
        .mock.calls.some(
          ([command]) => command.name === "core" && command.args.includes("up"),
        ),
    ).toBe(true);
    expect(
      vi
        .mocked(run)
        .mock.calls.some(([command]) => command.args.includes("stop")),
    ).toBe(false);
    expect(log).toHaveBeenCalledWith(
      "migrate",
      expect.stringContaining("Database migration failed"),
      "stderr",
    );
  } finally {
    await services.stop();
    await rm(root, { recursive: true, force: true });
  }
});
it("does not start Colima after cancellation or when VM management is disabled", async () => {
  vi.mocked(run).mockRejectedValueOnce(new Error("Docker is offline"));
  await expect(
    ensureDocker(
      {
        ...context,
        config: {
          ...context.config,
          docker: { ...context.config.docker, manageColima: false },
        },
      },
      {},
      () => {},
    ),
  ).rejects.toThrow("Docker is offline");
  const controller = new AbortController();
  controller.abort();
  vi.mocked(run).mockRejectedValueOnce(new Error("Cancelled"));
  await expect(
    ensureDocker(context, {}, () => {}, controller.signal),
  ).rejects.toBeDefined();
  expect(
    vi.mocked(run).mock.calls.some(([command]) => command.name === "colima"),
  ).toBe(false);
});

it.each([true, false])(
  "owns local Supabase only when it started it (already running: %s)",
  async (alreadyRunning) => {
    const logs = vi.fn();
    vi.mocked(run).mockImplementation(async (command, log) => {
      if (command.name !== "supabase") return;
      if (command.args.includes("status") || command.args.includes("start"))
        log("supabase", "private-cli-output-for-test-only");
      if (command.args.includes("status") && !alreadyRunning)
        throw new Error("not running");
    });
    const services = new Services(
      {
        ...context,
        config: {
          ...context.config,
          development: { workspace: "/test-checkout" },
        },
      },
      logs,
    );
    await services.start();
    await services.stop();
    const commands = vi
      .mocked(run)
      .mock.calls.filter(([command]) => command.name === "supabase")
      .map(([command]) => command.args);
    expect(commands.map((args) => args.at(-1))).toEqual(
      alreadyRunning ? ["status"] : ["status", "start", "stop"],
    );
    expect(commands.flat()).not.toContain("--no-backup");
    expect(commands.flat()).not.toContain("--all");
    expect(commands.flat()).not.toContain("reset");
    expect(JSON.stringify(logs.mock.calls)).not.toContain(
      "private-cli-output-for-test-only",
    );
  },
);
