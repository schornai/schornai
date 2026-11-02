import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { parse } from "yaml";

const root = new URL("../packages/xrag/update/container/", import.meta.url);
const directories: string[] = [];
afterEach(() => {
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "postgres-health-"));
  directories.push(dir);
  const data = join(dir, "data");
  const bin = join(dir, "bin");
  mkdirSync(join(data, "global"), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(data, "global/pg_control"), "control file");
  return {
    dir,
    data,
    bin,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, PGDATA: data },
  };
}

it("uses the real database health check in the installed stack", () => {
  const compose = parse(
    readFileSync(new URL("supabase/overrides.yml", root), "utf8").replaceAll(
      "!override",
      "",
    ),
  );
  expect(compose.services.db.healthcheck.test).toEqual([
    "CMD",
    "/bin/sh",
    "/check-health.sh",
  ]);
  expect(compose.services.db.volumes).toContain(
    "./volumes/db/check-health.sh:/check-health.sh:ro,z",
  );
});

it("checks real database and file reads with bounded timeouts and propagates failure", () => {
  const f = fixture();
  writeFileSync(join(f.bin, "gosu"), '#!/bin/sh\nshift\nexec "$@"\n', {
    mode: 0o755,
  });
  const output = join(f.dir, "psql-args");
  writeFileSync(
    join(f.bin, "psql"),
    '#!/bin/sh\nprintf "%s\\n" "$PGCONNECT_TIMEOUT" "$PGOPTIONS" "$@" > "$PSQL_ARGS"\nexit "$PSQL_EXIT"\n',
    { mode: 0o755 },
  );
  const script = new URL("volumes/db/check-health.sh", root);
  const env = {
    ...f.env,
    POSTGRES_DB: "custom-database",
    PSQL_ARGS: output,
    PSQL_EXIT: "0",
  };
  execFileSync("sh", [script.pathname], { env });
  const args = readFileSync(output, "utf8");
  expect(args).toContain("3\n-c statement_timeout=3000\n");
  expect(args).toContain("-d\ncustom-database\n");
  expect(args).toContain("ON_ERROR_STOP=1");
  expect(args).toContain("FROM pg_catalog.pg_database");
  expect(
    spawnSync("sh", [script.pathname], { env: { ...env, PSQL_EXIT: "2" } })
      .status,
  ).toBe(2);
  rmSync(output);
  rmSync(join(f.data, "global/pg_control"));
  expect(spawnSync("sh", [script.pathname], { env }).status).not.toBe(0);
  expect(existsSync(output)).toBe(false);
});
