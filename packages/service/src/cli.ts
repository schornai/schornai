import { parseArgs } from "node:util";
import { closeSync, openSync } from "node:fs";
import { mkdir, open, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { defaultConfigPath, initConfig, loadConfig } from "./config.ts";
import { control } from "./control.ts";
import { runDaemon } from "./daemon.ts";
import { setupInitialAdmin } from "./initialAdmin.ts";
import { initialAdminMessages } from "./initialAdminMessages.ts";
import { serviceStartupTimeoutMs } from "./services.ts";

const help = `Usage: schornai service <init|start|stop|restart|status|sync|logs|run|setup-admin> [options]
  --config PATH        Machine configuration (default: ~/.aibox/config.json)
  --services LIST      Comma-separated services for init; default: none
  --follow             Follow logs
  --json               Machine-readable status/logs
  --lines NUMBER       Recent log lines (default: 100)
  sync                 Reconcile artifacts now (requires a running service and sharing)
  run                  Run in the foreground (e.g. systemd/launchd)
  setup-admin          ${initialAdminMessages().help}
Services: core, supabase, transcriber-mlx, document-extractor, ollama
`;
export async function runServiceCLI(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      services: { type: "string" },
      lines: { type: "string" },
      follow: { type: "boolean" },
      json: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help || !positionals.length) {
    console.log(help);
    return;
  }
  if (positionals[0] !== "service" || positionals.length !== 2)
    throw new Error(help);
  const action = positionals[1];
  const path = resolve(
    values.config ?? process.env.SCHORNAI_CONFIG ?? defaultConfigPath(),
  );
  const root = dirname(path);
  if (action === "setup-admin") {
    await setupInitialAdmin(await loadConfig(path));
    return;
  }
  if (action === "init") {
    await initConfig(path, values.services?.split(",").filter(Boolean) ?? []);
    console.log(`Created ${path}`);
    return;
  }
  if (action === "run") {
    await runDaemon(path);
    return;
  }
  if (action === "logs") {
    const lines = Number(values.lines ?? 100);
    if (!Number.isInteger(lines) || lines < 1 || lines > 10_000)
      throw new Error("--lines must be between 1 and 10000");
    const file = join(root, "logs/service.log");
    let offset = 0;
    let inode = 0;
    let first = true;
    let pending = "";
    do {
      try {
        const current = await stat(file);
        if (inode !== current.ino || current.size < offset) {
          offset = 0;
          pending = "";
        }
        inode = current.ino;
        if (first) offset = Math.max(0, current.size - 2 * 1024 * 1024);
        const handle = await open(file, "r");
        let text: string;
        try {
          const buffer = Buffer.alloc(
            Math.max(0, Math.min(current.size - offset, 2 * 1024 * 1024)),
          );
          const result = await handle.read(buffer, 0, buffer.length, offset);
          text =
            pending + buffer.subarray(0, result.bytesRead).toString("utf8");
          offset += result.bytesRead;
        } finally {
          await handle.close();
        }
        const entries = text.split("\n");
        pending = entries.pop() ?? "";
        for (const line of first ? entries.slice(-lines) : entries) {
          if (!line) continue;
          if (values.json) {
            console.log(line);
            continue;
          }
          try {
            const entry = JSON.parse(line);
            console.log(
              `${entry.timestampISO} [${entry.sender}] ${entry.message}`,
            );
          } catch {
            /* Initial tail may begin in the middle of a line. */
          }
        }
        first = false;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (values.follow) await delay(300);
    } while (values.follow);
    return;
  }
  const status = async () => {
    try {
      return await control(root, "status");
    } catch (error) {
      if (
        ["ENOENT", "ECONNREFUSED", "EPIPE", "ECONNRESET"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        return undefined;
      throw error;
    }
  };
  if (action === "sync") {
    if (!(await status()))
      throw new Error("Service is not running; start it before syncing");
    const current = await control(root, "sync");
    console.log(
      values.json
        ? JSON.stringify({ ...current, sync: "queued" })
        : "Synchronization requested; inspect service logs for the result",
    );
    return;
  }
  if (action === "status") {
    const current = await status();
    console.log(
      values.json
        ? JSON.stringify(current ?? { state: "stopped", services: [] })
        : current
          ? `${current.state} (PID ${current.pid}): ${current.services.join(", ")}`
          : "stopped",
    );
    return;
  }
  if (action === "stop" || action === "restart") {
    if (await status()) {
      await control(root, "stop");
      const deadline = Date.now() + 120_000;
      while (await status()) {
        if (Date.now() > deadline)
          throw new Error("Stop timed out; inspect service logs");
        await delay(250);
      }
    }
    if (action === "stop") {
      console.log("Service stopped");
      return;
    }
  }
  if (action === "start" || action === "restart") {
    if (await status()) {
      console.log("Service already running");
      return;
    }
    const { config } = await loadConfig(path);
    await mkdir(join(root, "logs"), { recursive: true, mode: 0o700 });
    const fd = openSync(join(root, "logs/service-launch.log"), "a", 0o600);
    const child = spawn(
      process.execPath,
      [process.argv[1]!, "service", "run", "--config", path],
      { detached: true, stdio: ["ignore", fd, fd] },
    );
    closeSync(fd);
    let error: Error | undefined;
    child.on("error", (value) => {
      error = value;
    });
    child.unref();
    const deadline = Date.now() + serviceStartupTimeoutMs(config);
    while (Date.now() < deadline) {
      if (error) throw error;
      if (child.exitCode !== null || child.signalCode !== null)
        throw new Error(
          "Service failed to start; inspect logs/service-launch.log and service logs",
        );
      const current = await status();
      if (current?.state === "running") {
        console.log(`Service running (PID ${current.pid})`);
        return;
      }
      await delay(250);
    }
    throw new Error("Service startup timed out; inspect service logs");
  }
  throw new Error(help);
}
