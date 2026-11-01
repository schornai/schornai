import { createServer } from "node:http";
import { mkdir, readFile, rm, chmod } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { loadConfig } from "./config.ts";
import { control, socketPath } from "./control.ts";
import { writeJson } from "./files.ts";
import { createLogger } from "./log.ts";
import { Services } from "./services.ts";
import { startSynchronization } from "./synchronization.ts";
import { createMetricsSampler } from "./metrics.ts";
import { hostname } from "node:os";
import type { MachineReport } from "@schornio/aibox-realtime/documents/services/_schema";
import { binary } from "./docker.ts";

export async function runDaemon(configPath: string) {
  const context = await loadConfig(configPath);
  const { root, config } = context;
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lock = join(root, ".service-lock");
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    try {
      await control(root, "status");
      throw new Error("Service is already running");
    } catch (probe) {
      if (!("code" in Object(probe))) throw probe;
    }
    const owner = JSON.parse(
      await readFile(join(lock, "owner.json"), "utf8"),
    ) as { pid: number };
    try {
      process.kill(owner.pid, 0);
      throw new Error("Service process still owns the lock");
    } catch (probe) {
      if ((probe as NodeJS.ErrnoException).code !== "ESRCH") throw probe;
    }
    await rm(lock, { recursive: true });
    await mkdir(lock, { mode: 0o700 });
  }
  await writeJson(join(lock, "owner.json"), { pid: process.pid });
  const socket = socketPath(root);
  await rm(socket, { force: true });
  const log = createLogger(
    root,
    {
      ...context.environment,
      ...Object.fromEntries(
        Object.entries(context.developmentEnvironments ?? {}).flatMap(
          ([app, values]) =>
            Object.entries(values).map(([key, value]) => [
              `${app}:${key}`,
              value,
            ]),
        ),
      ),
    },
    Boolean(config.development),
  );
  const controller = new AbortController();
  let state: MachineReport["state"] = "starting";
  let synchronization: ReturnType<typeof startSynchronization>;
  const sample = createMetricsSampler(root);
  let restart = false;
  const services = new Services(context, log);
  const stop = () => {
    state = "stopping";
    controller.abort();
  };
  // A terminal and Node's outer watcher can both forward the same signal.
  // Keep handling repeated interrupts until all owned services have stopped.
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  const server = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/sync") {
      if (!synchronization || state === "stopping") {
        response.writeHead(409, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            error: "Sharing is not configured or service is stopping",
          }),
        );
        return;
      }
      synchronization.request();
    } else if (request.method === "POST" && request.url === "/stop") stop();
    else if (request.method !== "GET" || request.url !== "/status") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        pid: process.pid,
        state,
        services: context.config.services,
      }),
    );
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socket, resolve);
    });
    await chmod(socket, 0o600);
    log("service", `Starting ${config.id}`);
    await services.start(controller.signal);
    if (controller.signal.aborted) return;
    state = "running";
    synchronization = startSynchronization(
      context,
      log,
      controller.signal,
      {
        beforeInstall: async () => {
          state = "updating";
          await services.stop({ keepDocker: true });
        },
        afterInstall: async (restartService) => {
          if (restartService) {
            restart = true;
            stop();
            return;
          }
          if (controller.signal.aborted) return;
          Object.assign(context, await loadConfig(configPath));
          services.reconfigure(context);
          try {
            await services.start(controller.signal);
            state = "running";
          } catch (error) {
            log(
              "service",
              `Failed to resume services: ${String(error)}`,
              "stderr",
            );
            stop();
            throw error;
          }
        },
      },
      async () => ({
        name: hostname(),
        platform: `${process.platform}/${process.arch}`,
        state,
        roles: context.config.services,
        services: await services.status(),
        metrics: await sample(),
      }),
    );
    await new Promise<void>((resolve) => {
      if (controller.signal.aborted) resolve();
      else
        controller.signal.addEventListener("abort", () => resolve(), {
          once: true,
        });
    });
  } finally {
    controller.abort();
    try {
      try {
        await synchronization?.stop();
      } finally {
        await services.stop();
      }
      log("service", "Stopped");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(socket, { force: true });
      await rm(lock, { recursive: true, force: true });
      process.removeListener("SIGTERM", stop);
      process.removeListener("SIGINT", stop);
    }
    // A systemd/launchd unit owns replacement processes itself. Spawning here
    // as well would race its restart and leave a daemon outside that unit.
    if (restart && !process.env.SCHORNAI_SERVICE_MANAGER) {
      const child = spawn(
        binary(root, "node", process.execPath),
        [
          join(root, "apps/service/cli.mjs"),
          "service",
          "run",
          "--config",
          configPath,
        ],
        { detached: true, stdio: "ignore", env: process.env },
      );
      child.unref();
    }
  }
}
