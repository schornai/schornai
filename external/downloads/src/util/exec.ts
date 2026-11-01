/* eslint-disable no-console */
import { spawn } from "node:child_process";

export async function exec(
  command: string,
  args?: string[],
  includeStderr = false,
  env?: NodeJS.ProcessEnv,
) {
  return await new Promise<string>((resolve, reject) => {
    const log = `EXEC: "${command} ${args?.join(" ")}"`;
    console.time(log);
    const process = spawn(command, args, { env });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    process.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    process.on("error", reject);

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }

      console.timeEnd(log);
      resolve(includeStderr ? stdout + stderr : stdout);
    });
  });
}
