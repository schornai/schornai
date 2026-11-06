import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beforeEach, expect, it, vi } from "vitest";
import { runDaemon } from "../packages/service/src/daemon.ts";
import { initConfig } from "../packages/service/src/config.ts";
import { control, socketPath } from "../packages/service/src/control.ts";
import { request as httpRequest } from "node:http";
import { startSynchronization } from "../packages/service/src/synchronization.ts";
import { spawn } from "node:child_process";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawn: vi.fn(() => ({ unref: vi.fn() })),
}));

vi.mock("../packages/service/src/synchronization.ts", () => ({
  startSynchronization: vi.fn(),
}));
vi.mock("../packages/service/src/services.ts", () => ({
  Services: class {
    start = serviceMocks.start;
    stop = serviceMocks.stop;
    reconfigure = serviceMocks.reconfigure;
    status = serviceMocks.status;
  },
}));
const serviceMocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  reconfigure: vi.fn(),
  status: vi.fn(),
  metrics: vi.fn(),
}));
vi.mock("../packages/service/src/metrics.ts", () => ({
  createMetricsSampler: () => serviceMocks.metrics,
}));
beforeEach(() => {
  serviceMocks.start.mockReset().mockResolvedValue(undefined);
  serviceMocks.stop.mockReset().mockResolvedValue(undefined);
  serviceMocks.reconfigure.mockReset();
  serviceMocks.status
    .mockReset()
    .mockResolvedValue([{ name: "core", state: "running" }]);
  serviceMocks.metrics.mockReset().mockResolvedValue({ cpu: 12 });
  vi.mocked(startSynchronization).mockReset();
});

it("refreshes the synchronizer environment and reported roles after a configuration-changing artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-reconfigure-"));
  const path = join(root, "config.json");
  await initConfig(path, []);
  vi.stubEnv("SITE_URL", undefined);
  await writeFile(join(root, "docker.env"), "SITE_URL=https://old.example\n");
  vi.mocked(startSynchronization).mockImplementation(
    (context, _log, _signal, hooks) => {
      const task = (async () => {
        try {
          expect(context.environment.SITE_URL).toBe("https://old.example");
          await hooks.beforeInstall();
          const config = JSON.parse(await readFile(path, "utf8"));
          config.services = ["supabase"];
          await writeFile(path, JSON.stringify(config));
          await writeFile(
            join(root, "docker.env"),
            "SITE_URL=https://new.example\n",
          );
          await hooks.afterInstall(false);
          expect(context.environment.SITE_URL).toBe("https://new.example");
          expect((await control(root, "status")).services).toEqual([
            "supabase",
          ]);
        } finally {
          await control(root, "stop");
        }
      })();
      return { request: vi.fn(), stop: () => task };
    },
  );
  try {
    await runDaemon(path);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it.each(["systemd", "launchd", undefined])(
  "lets %s own the replacement process after a setup update",
  async (manager) => {
    const root = await mkdtemp(join(tmpdir(), "service-restart-"));
    const path = join(root, "config.json");
    await initConfig(path, []);
    vi.stubEnv("SCHORNAI_SERVICE_MANAGER", manager);
    vi.mocked(spawn).mockClear();
    vi.mocked(startSynchronization).mockImplementation(
      (_context, _log, _signal, hooks) => {
        const task = hooks.afterInstall(true);
        return { request: vi.fn(), stop: () => task };
      },
    );
    try {
      await runDaemon(path);
      if (manager) expect(spawn).not.toHaveBeenCalled();
      else
        expect(spawn).toHaveBeenCalledWith(
          expect.any(String),
          [
            join(root, "apps/service/cli.mjs"),
            "service",
            "run",
            "--config",
            path,
          ],
          expect.objectContaining({ detached: true }),
        );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

it("refuses to steal a lock from a live process even when its control socket is absent", async () => {
  const root = await mkdtemp(join(tmpdir(), "daemon-live-lock-")),
    path = join(root, "config.json");
  try {
    await initConfig(path, []);
    await mkdir(join(root, ".service-lock"));
    await writeFile(
      join(root, ".service-lock/owner.json"),
      JSON.stringify({ pid: process.pid }),
    );
    await expect(runDaemon(path)).rejects.toThrow(
      "Service process still owns the lock",
    );
    expect(serviceMocks.start).not.toHaveBeenCalled();
    expect(
      JSON.parse(await readFile(join(root, ".service-lock/owner.json"), "utf8"))
        .pid,
    ).toBe(process.pid);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("removes socket and lock after a service fails to start", async () => {
  const root = await mkdtemp(join(tmpdir(), "daemon-start-failed-")),
    path = join(root, "config.json");
  const listeners = process.listenerCount("SIGTERM");
  try {
    await initConfig(path, []);
    serviceMocks.start.mockRejectedValueOnce(new Error("start failed"));
    await expect(runDaemon(path)).rejects.toThrow("start failed");
    expect(serviceMocks.stop).toHaveBeenCalledOnce();
    expect(startSynchronization).not.toHaveBeenCalled();
    await expect(stat(socketPath(root))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(stat(join(root, ".service-lock"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(process.listenerCount("SIGTERM")).toBe(listeners);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function localRequest(root: string, method: string, path: string) {
  return new Promise<number>((resolve, reject) => {
    const request = httpRequest(
      { socketPath: socketPath(root), method, path },
      (response) => {
        response.resume();
        response.once("end", () => resolve(response.statusCode!));
      },
    );
    request.once("error", reject);
    request.end();
  });
}

it.each([false, true])(
  "serves local status and handles sync availability (%s)",
  async (sharing) => {
    const root = await mkdtemp(join(tmpdir(), "daemon-control-")),
      path = join(root, "config.json");
    const syncRequest = vi.fn();
    vi.mocked(startSynchronization).mockReturnValue(
      sharing ? { request: syncRequest, stop: vi.fn() } : undefined,
    );
    await initConfig(path, []);
    const daemon = runDaemon(path);
    try {
      await vi.waitFor(async () =>
        expect((await control(root, "status")).state).toBe("running"),
      );
      await expect(runDaemon(path)).rejects.toThrow(
        "Service is already running",
      );
      expect(await localRequest(root, "GET", "/missing")).toBe(404);
      expect(await localRequest(root, "POST", "/status")).toBe(404);
      expect(await localRequest(root, "POST", "/sync")).toBe(
        sharing ? 200 : 409,
      );
      expect(syncRequest).toHaveBeenCalledTimes(sharing ? 1 : 0);
      const report = await vi.mocked(startSynchronization).mock.calls[0]![4]();
      expect(report).toMatchObject({
        state: "running",
        roles: [],
        services: [{ name: "core", state: "running" }],
        metrics: { cpu: 12 },
      });
    } finally {
      await control(root, "stop");
      await daemon;
      await rm(root, { recursive: true, force: true });
    }
  },
);

it("recovers a stale lock and stops cleanly when updated services cannot resume", async () => {
  const root = await mkdtemp(join(tmpdir(), "daemon-stale-")),
    path = join(root, "config.json");
  try {
    await initConfig(path, []);
    await mkdir(join(root, ".service-lock"));
    await writeFile(
      join(root, ".service-lock/owner.json"),
      JSON.stringify({ pid: 2147483647 }),
    );
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("gone"), { code: "ESRCH" });
    });
    serviceMocks.start
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("resume failed"));
    let resumed!: Promise<unknown>;
    vi.mocked(startSynchronization).mockImplementation(
      (_context, _log, _signal, hooks) => {
        resumed = (async () => {
          await hooks.beforeInstall();
          await expect(hooks.afterInstall(false)).rejects.toThrow(
            "resume failed",
          );
        })();
        return { request: vi.fn(), stop: () => resumed };
      },
    );
    await runDaemon(path);
    await resumed;
    expect(kill).toHaveBeenCalledWith(2147483647, 0);
    expect(serviceMocks.reconfigure).toHaveBeenCalledOnce();
    expect(serviceMocks.stop).toHaveBeenCalledTimes(2);
    await expect(stat(join(root, ".service-lock"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
