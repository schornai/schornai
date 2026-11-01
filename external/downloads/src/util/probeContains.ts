/* eslint-disable no-console */
import { exec } from "./exec.ts";

export async function probeContains(
  contains: string,
  command: string,
  args?: string[],
  env?: NodeJS.ProcessEnv,
) {
  const stdout = await exec(command, args, true, env);

  const actual = stdout.trim().replaceAll("\n", "\\n");

  if (actual.includes(contains)) {
    console.log(`PROBE CONTAINS: success "${contains}" in "${actual}"`);
  } else {
    console.error(
      `PROBE CONTAINS: failed Should contain "${contains}", Actual: "${actual}"`,
    );
    throw new Error(`Should contain "${contains}", Actual: "${actual}"`);
  }
}
