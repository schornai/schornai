import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import type { Log } from "./log.ts";

export type Command = {
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
};
export function launch(spec: Command, log: Log) {
  const env = { ...spec.env };
  // The outer Node watcher owns this IPC protocol. Passing it through to
  // Next.js/Jest workers makes them receive unexpected dependency messages.
  // A child started with --watch establishes its own reporting channel.
  delete env.WATCH_REPORT_DEPENDENCIES;
  const child = spawn(spec.command, spec.args, {
    cwd: spec.cwd,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const channel of ["stdout", "stderr"] as const) {
    const reader = createInterface({ input: child[channel]! });
    reader.on("line", (line) => log(spec.name, line, channel));
  }
  return child;
}
export function completion(
  child: ChildProcess,
  event: "close" | "exit" = "close",
): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once(event, (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`Process exited (${code ?? signal})`)),
    );
  });
}
export async function terminate(child: ChildProcess, graceMs = 10_000) {
  if (!child.pid) return;
  const kill = (signal: NodeJS.Signals) => {
    try {
      process.kill(-child.pid!, signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  };
  kill("SIGTERM");
  const deadline = Date.now() + graceMs;
  // A Node worker may exit while its Python child is still running. Wait for
  // the entire process group, not just the direct child's exit/pipe closure.
  while (true) {
    try {
      process.kill(-child.pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      throw error;
    }
    if (Date.now() >= deadline) {
      kill("SIGKILL");
      return;
    }
    await delay(50);
  }
}
export async function run(spec: Command, log: Log, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const child = launch(spec, log);
  let stopping: Promise<void> | undefined;
  const stopped = () => {
    stopping ??= terminate(child);
    void stopping.catch(() => {});
  };
  signal?.addEventListener("abort", stopped, { once: true });
  try {
    await completion(child);
  } finally {
    signal?.removeEventListener("abort", stopped);
    await stopping;
  }
}
