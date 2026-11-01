/* eslint-disable no-console */
import { exec } from "./exec.ts";

export async function probe(
  expected: string,
  command: string,
  args?: string[],
) {
  const stdout = await exec(command, args, true);

  const actual = stdout.trim();

  if (actual !== expected) {
    console.error(`PROBE: failed Expected "${expected}", Actual: "${actual}"`);
    throw new Error(`Expected "${expected}", Actual: "${actual}"`);
  }
  console.log(`PROBE: success "${actual}"`);
}
