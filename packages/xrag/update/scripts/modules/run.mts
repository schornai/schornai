import type { Readable } from "node:stream";
import type { SpawnOptionsWithoutStdio } from "child_process";
import { once } from "node:events";
import { spawn } from "node:child_process";

async function collect(stream: Readable) {
  const { promise, reject, resolve } = Promise.withResolvers<string>();
  const chunks: string[] = [];
  stream.setEncoding("utf8");

  stream.on("data", (chunk: unknown) => {
    chunks.push(String(chunk));
  });

  stream.on("close", () => {
    resolve(chunks.join(""));
  });

  stream.on("error", (error) => {
    reject(error);
  });

  return await promise;
}

export async function run(
  cmd: string,
  args: string[],
  options?: SpawnOptionsWithoutStdio & { quiet?: boolean },
) {
  const cmdString = [cmd, ...args]
    .map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))
    .join(" ");

  console.log(`RUN ${cmdString}`);
  const { quiet, ...spawnOptions } = options ?? {};
  const childProcess = spawn(cmd, args, spawnOptions);

  const stdoutPromise = collect(childProcess.stdout);
  const stderrPromise = collect(childProcess.stderr);

  if (!quiet) {
    childProcess.stderr.pipe(process.stderr);
    childProcess.stdout.pipe(process.stdout);
  }

  const [[code], stdout, stderr] = await Promise.all([
    once(childProcess, "close"),
    stdoutPromise,
    stderrPromise,
  ]);

  if (code !== 0) {
    throw new Error(
      `Command "${cmdString}" failed with error code ${code}${quiet ? `: ${stderr}` : ""}`,
    );
  }

  return { stderr, stdout };
}
