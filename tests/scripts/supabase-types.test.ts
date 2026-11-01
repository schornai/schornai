import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../../scripts/supabase-types.mjs", import.meta.url),
);
const directories: string[] = [];
afterEach(() =>
  directories
    .splice(0)
    .forEach((path) => rmSync(path, { recursive: true, force: true })),
);

function run(generator: string, databaseUrl?: string) {
  const cwd = mkdtempSync(join(tmpdir(), "supabase-types-test-"));
  directories.push(cwd);
  const paths = [
    "supabase/types.ts",
    "packages/database/src/_shared/_supabase.ts",
  ].map((path) => join(cwd, path));
  for (const path of paths) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "original types");
  }
  const cli = join(cwd, "npx");
  writeFileSync(
    cli,
    `#!/bin/sh\nprintf '%s\\n' "$@" > args.txt\n${generator}\n`,
  );
  chmodSync(cli, 0o755);
  const result = spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${cwd}:${process.env.PATH}`,
      SUPABASE_TYPES_DB_URL: databaseUrl ?? "",
    },
  });
  return {
    result,
    contents: paths.map((path) => readFileSync(path, "utf8")),
    args: readFileSync(join(cwd, "args.txt"), "utf8"),
  };
}

describe("Supabase type generation", () => {
  it("writes the same generated schema to both files and defaults to the local database", () => {
    const test = run("printf 'export type Database = {};\\n'");
    expect(test.result.status).toBe(0);
    expect(test.contents).toEqual([
      "export type Database = {};\n",
      "export type Database = {};\n",
    ]);
    expect(test.args).toContain("--local");
  });
  it("supports a disposable target without logging its credentials", () => {
    const url =
      "postgresql://owner:private-password@localhost:54322/disposable";
    const test = run("printf 'export type Database = {};\\n'", url);
    expect(test.result.status).toBe(0);
    expect(test.args).toContain(`--db-url\n${url}`);
    expect(test.args).not.toContain("--local");
    expect(test.result.stdout + test.result.stderr).not.toContain(
      "private-password",
    );
  });
  it.each(["printf 'partial'; exit 1", "printf 'invalid success output'"])(
    "preserves both files when generation fails (%s)",
    (generator) => {
      const test = run(generator);
      expect(test.result.status).toBe(1);
      expect(test.contents).toEqual(["original types", "original types"]);
    },
  );
});
