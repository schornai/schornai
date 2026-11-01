import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { ChildProcess } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ServiceStatus } from "@schornio/aibox-realtime/documents/services/_schema";
import type { Context } from "./config.ts";
import type { Log } from "./log.ts";
import { completion, launch, run, terminate, type Command } from "./process.ts";
import { binary, ensureDocker } from "./docker.ts";
import { serviceCommands } from "./serviceCommands.ts";

export class Services {
  private nativeStates = new Map<string, ServiceStatus>();
  private children = new Set<ChildProcess>();
  private activeCompose: Command[] = [];
  private controller = new AbortController();
  private loops: Promise<void>[] = [];
  private colima?: Command;
  private localSupabase?: Command;
  private ownsLocalSupabase = false;
  private context: Context;
  private log: Log;
  constructor(context: Context, log: Log) {
    this.context = context;
    this.log = log;
  }
  reconfigure(context: Context) {
    this.context = context;
  }
  async start(parentSignal?: AbortSignal) {
    this.controller = new AbortController();
    const abort = () => this.controller.abort();
    parentSignal?.addEventListener("abort", abort, { once: true });
    if (parentSignal?.aborted) abort();
    const { signal } = this.controller;
    try {
      const { native, compose, env, localSupabase } = serviceCommands(
        this.context,
      );
      // The realtime container watches this directory through a read-only bind
      // mount, including on web-only hosts with a remote Ollama service.
      if (this.context.config.services.includes("core"))
        await mkdir(join(this.context.root, "ollama/models/manifests"), {
          recursive: true,
        });
      if (compose.length || localSupabase)
        this.colima =
          (await ensureDocker(this.context, env, this.log, signal)) ??
          this.colima;
      if (localSupabase) {
        this.localSupabase = localSupabase;
        try {
          // `status` contains credentials: never forward its output to logs.
          await run(
            { ...localSupabase, args: [...localSupabase.args, "status"] },
            () => {},
            signal,
          );
          this.log("supabase", "Using the running local Supabase project");
        } catch {
          signal.throwIfAborted();
          // `start` also prints credentials. Report progress without that output.
          this.log(
            "supabase",
            "Starting the repository's local Supabase project",
          );
          try {
            await run(
              { ...localSupabase, args: [...localSupabase.args, "start"] },
              () => {},
              signal,
            );
            this.ownsLocalSupabase = true;
          } catch {
            signal.throwIfAborted();
            throw new Error(
              "Local Supabase failed to start; check its CLI status and Docker container logs",
            );
          }
        }
      }
      if (compose.length) {
        const network =
          this.context.environment.SERVICE_DOCKER_NETWORK ?? "schornai";
        const spec = {
          name: "docker",
          command: binary(this.context.root, "docker"),
          env,
        };
        try {
          await run(
            { ...spec, args: ["network", "inspect", network] },
            () => {},
            signal,
          );
        } catch {
          await run(
            { ...spec, args: ["network", "create", network] },
            this.log,
            signal,
          );
        }
      }
      for (const { spec, services } of compose) {
        this.activeCompose.push(spec);
        await run(
          {
            ...spec,
            args: [
              ...spec.args,
              "up",
              "-d",
              "--wait",
              "--wait-timeout",
              "180",
              ...(this.context.config.development && spec.name === "core"
                ? ["--build"]
                : []),
              ...services,
            ],
          },
          this.log,
          signal,
        );
        if (
          spec.name === "supabase" &&
          this.context.config.services.includes("supabase")
        ) {
          try {
            await run(
              {
                ...spec,
                args: [...spec.args, "run", "--rm", "--no-deps", "migrate"],
              },
              this.log,
              signal,
            );
          } catch (error) {
            signal.throwIfAborted();
            // Keep the web app reachable for diagnosis and another setup update.
            this.log(
              "migrate",
              `Database migration failed: ${String(error)}`,
              "stderr",
            );
          }
        }
        this.monitor({
          ...spec,
          name: `${spec.name}:logs`,
          args: [
            ...spec.args,
            "logs",
            "--follow",
            "--no-color",
            "--tail",
            "100",
          ],
        });
      }
      for (const spec of native) this.monitor(spec);
      this.log(
        "service",
        `Started services: ${this.context.config.services.join(", ") || "none"}`,
      );
    } catch (error) {
      await this.stop();
      throw error;
    } finally {
      parentSignal?.removeEventListener("abort", abort);
    }
  }
  private monitor(spec: Command) {
    const { signal } = this.controller;
    const loop = (async () => {
      let retry = 1000;
      while (!signal.aborted) {
        this.nativeStates.set(spec.name, {
          name: spec.name,
          state: "starting",
        });
        const started = Date.now();
        const child = launch(spec, this.log);
        child.once("spawn", () =>
          this.nativeStates.set(spec.name, {
            name: spec.name,
            state: "running",
          }),
        );
        this.children.add(child);
        try {
          // Descendants can keep inherited pipes open after the worker exits.
          // Clean them up before waiting for pipe closure or restarting it.
          await completion(child, "exit");
        } catch (error) {
          this.nativeStates.set(spec.name, { name: spec.name, state: "error" });
          if (!signal.aborted) this.log(spec.name, String(error), "stderr");
        } finally {
          await terminate(child);
          this.children.delete(child);
        }
        if (signal.aborted) break;
        this.nativeStates.set(spec.name, {
          name: spec.name,
          state: "restarting",
        });
        if (Date.now() - started > 60_000) retry = 1000;
        this.log(spec.name, `Restarting in ${retry} ms`, "stderr");
        await delay(retry, undefined, { signal }).catch(() => {});
        retry = Math.min(retry * 2, 30_000);
      }
      this.nativeStates.set(spec.name, { name: spec.name, state: "stopped" });
    })();
    this.loops.push(loop);
  }
  async status(): Promise<ServiceStatus[]> {
    const native = [...this.nativeStates.values()].filter(
      ({ name }) => !name.endsWith(":logs"),
    );
    const compose = await Promise.all(
      this.activeCompose.map(async (spec): Promise<ServiceStatus[]> => {
        try {
          const { stdout } = await promisify(execFile)(
            spec.command,
            [...spec.args, "ps", "--all", "--format", "json"],
            {
              env: spec.env,
              cwd: spec.cwd,
              timeout: 3000,
              maxBuffer: 1024 * 1024,
            },
          );
          const source = stdout.trim();
          const rows = source.startsWith("[")
            ? JSON.parse(source)
            : source
                .split("\n")
                .filter(Boolean)
                .map((line) => JSON.parse(line));
          return rows.map(
            (row: { Service: string; State: string; Health?: string }) => ({
              name: `${spec.name}:${row.Service}`,
              state:
                row.State === "running"
                  ? "running"
                  : row.State === "restarting"
                    ? "restarting"
                    : row.State === "created"
                      ? "starting"
                      : row.State === "exited" || row.State === "dead"
                        ? "stopped"
                        : "unknown",
              ...(["healthy", "unhealthy", "starting"].includes(
                row.Health ?? "",
              )
                ? { health: row.Health as ServiceStatus["health"] }
                : {}),
            }),
          );
        } catch {
          return [{ name: spec.name, state: "unknown" }];
        }
      }),
    );
    if (this.localSupabase) {
      try {
        await promisify(execFile)(
          this.localSupabase.command,
          [...this.localSupabase.args, "status"],
          {
            cwd: this.localSupabase.cwd,
            env: this.localSupabase.env,
            timeout: 5000,
          },
        );
        native.push({ name: "supabase", state: "running" });
      } catch {
        native.push({ name: "supabase", state: "error" });
      }
    }
    return [...native, ...compose.flat()];
  }
  async stop({ keepDocker = false }: { keepDocker?: boolean } = {}) {
    this.controller.abort();
    await Promise.all([...this.children].map((child) => terminate(child)));
    await Promise.all(this.loops);
    this.loops = [];
    const failures: unknown[] = [];
    for (const spec of this.activeCompose.reverse()) {
      try {
        await run(
          { ...spec, args: [...spec.args, "stop", "--timeout", "30"] },
          this.log,
        );
      } catch (error) {
        failures.push(error);
        this.log(spec.name, "Could not stop Compose project", "stderr");
      }
    }
    this.activeCompose = [];
    if (this.localSupabase && this.ownsLocalSupabase) {
      try {
        await run(
          { ...this.localSupabase, args: [...this.localSupabase.args, "stop"] },
          this.log,
        );
      } catch (error) {
        failures.push(error);
      }
    }
    this.localSupabase = undefined;
    this.ownsLocalSupabase = false;
    if (this.colima && !keepDocker) {
      try {
        await run({ ...this.colima, args: ["stop"] }, this.log);
      } catch (error) {
        failures.push(error);
      }
      this.colima = undefined;
    }
    if (failures.length)
      throw new AggregateError(failures, "Some services could not be stopped");
  }
}
