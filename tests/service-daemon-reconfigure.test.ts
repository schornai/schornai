import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
import { runDaemon } from "../packages/service/src/daemon.ts";
import { initConfig } from "../packages/service/src/config.ts";
import { control } from "../packages/service/src/control.ts";
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
    async start() {}
    async stop() {}
    reconfigure() {}
  },
}));

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
