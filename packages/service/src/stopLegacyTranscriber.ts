import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { realpath } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { Log } from "./log.ts";

const execute = promisify(execFile);

/** Some old Admin versions do not terminate their Node transcriber on quit. */
export async function stopLegacyTranscriber(root: string, log: Log) {
  if (process.platform !== "darwin") return;
  let cwd: string;
  try {
    cwd = await realpath(join(root, "apps/transcriber-mac"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const matches = await execute("/usr/sbin/lsof", [
    "-a",
    "-u",
    String(process.getuid!()),
    "-d",
    "cwd",
    "-F",
    "pn",
    "--",
    cwd,
  ]).catch((error: { code?: number }) => {
    if (error.code === 1) return { stdout: "" };
    throw error;
  });
  for (const match of matches.stdout.matchAll(/^p(\d+)$/gm)) {
    const pid = Number(match[1]);
    const { stdout: command } = await execute("/bin/ps", [
      "-p",
      String(pid),
      "-o",
      "command=",
    ]).catch(() => ({ stdout: "" }));
    if (!/^(?:\S*\/)?node\s+appTranscriberMac\.js\s*$/.test(command.trim()))
      continue;
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") continue;
      throw error;
    }
    log("setup", "Stopping the legacy transcriber");
    const deadline = Date.now() + 15_000;
    while (true) {
      try {
        process.kill(pid, 0);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ESRCH") break;
        throw error;
      }
      if (Date.now() > deadline)
        throw new Error(
          "Legacy transcriber did not stop; update halted before replacing its files",
        );
      await delay(100);
    }
  }
}
