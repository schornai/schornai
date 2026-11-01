import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
import type { ChildProcess } from "node:child_process";
import type { Context } from "../packages/service/src/config.ts";
import { configSchema } from "../packages/service/src/config.ts";
import { Services } from "../packages/service/src/services.ts";
import { ensureDocker } from "../packages/service/src/docker.ts";
import { run, completion, terminate } from "../packages/service/src/process.ts";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
vi.mock("../packages/service/src/process.ts", () => ({
  run: vi.fn(),
  launch: () => new EventEmitter(),
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
  vi.mocked(run).mockReset();
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
