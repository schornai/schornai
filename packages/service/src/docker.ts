import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "./config.ts";
import type { Log } from "./log.ts";
import { run, type Command } from "./process.ts";

export function binary(root: string, name: string, fallback = name) {
  const file = join(root, "bin", name, name);
  return existsSync(file) ? file : fallback;
}

/** Return ownership only when this caller had to start the VM. */
export async function ensureDocker(
  context: Context,
  env: NodeJS.ProcessEnv,
  log: Log,
  signal?: AbortSignal,
): Promise<Command | undefined> {
  try {
    await run(
      {
        name: "docker",
        command: binary(context.root, "docker"),
        args: ["info"],
        env,
      },
      () => {},
      signal,
    );
    return undefined;
  } catch (error) {
    signal?.throwIfAborted();
    if (!context.config.docker.manageColima) throw error;
  }
  const colima = {
    name: "colima",
    command: binary(context.root, "colima"),
    args: [],
    env,
  };
  try {
    await run(
      {
        ...colima,
        args: ["start", "--memory", String(context.config.docker.memory)],
      },
      log,
      signal,
    );
  } catch (error) {
    await run({ ...colima, args: ["stop"] }, log).catch(() => {});
    throw error;
  }
  return colima;
}
