import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";

const script = fileURLToPath(
  new URL(
    "../packages/xrag/update/container/volumes/db/prepare-data.sh",
    import.meta.url,
  ),
);
const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "postgres-data-")));
  temporary.push(root);
  const legacy = join(root, "legacy");
  const volume = join(root, "volume");
  const target = join(volume, "pgdata");
  const staging = join(volume, ".pgdata-import");
  const bin = join(root, "bin");
  const calls = join(root, "entrypoint-calls");
  for (const directory of [legacy, volume, bin]) mkdirSync(directory);
  writeFileSync(
    join(bin, "docker-entrypoint.sh"),
    '#!/bin/sh\nprintf "%s\\n" "$PGDATA" "$@" >> "$ENTRYPOINT_CALLS"\n',
    { mode: 0o755 },
  );
  // A successful no-op here keeps shell tests independent of host-wide flushes.
  // The real image integration exercises the actual filesystem and sync.
  writeFileSync(join(bin, "sync"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  });
  return {
    root,
    legacy,
    volume,
    target,
    staging,
    calls,
    mockCopy(body: string) {
      writeFileSync(join(bin, "cp"), `#!/bin/sh\n${body}\n`, {
        mode: 0o755,
      });
    },
    run(environment: NodeJS.ProcessEnv = {}) {
      return spawnSync("sh", [script, "postgres", "-c", "test.setting=1"], {
        encoding: "utf8",
        timeout: 10_000,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          PGDATA: target,
          LEGACY_PGDATA: legacy,
          ENTRYPOINT_CALLS: calls,
          ...environment,
        },
      });
    },
  };
}

function cluster(directory: string) {
  for (const child of [
    "base/1",
    "global",
    "pg_commit_ts",
    "pg_dynshmem",
    "pg_logical",
    "pg_multixact",
    "pg_notify",
    "pg_replslot",
    "pg_serial",
    "pg_snapshots",
    "pg_stat",
    "pg_stat_tmp",
    "pg_subtrans",
    "pg_tblspc",
    "pg_twophase",
    "pg_wal",
    "pg_xact",
  ])
    mkdirSync(join(directory, child), { recursive: true, mode: 0o700 });
  for (const [file, contents] of [
    ["PG_VERSION", "15\n"],
    ["base/1/PG_VERSION", "15\n"],
    ["base/1/12345", "database-page-fixture\0\xff"],
    ["global/pg_control", "control-file-fixture"],
    ["global/pg_filenode.map", "filenode-map-fixture"],
    ["pg_wal/000000010000000000000001", "wal-page-fixture\0"],
    ["pg_xact/0000", "transaction-status-fixture"],
    [".preserved", "hidden-file-fixture"],
  ])
    writeFileSync(join(directory, file!), contents!, { mode: 0o600 });
}

function snapshot(directory: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) result[name] = `link:${readlinkSync(path)}`;
    else if (stat.isDirectory()) {
      result[name] = "directory";
      for (const [child, value] of Object.entries(snapshot(path)))
        result[`${name}/${child}`] = value;
    } else
      result[name] = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
  }
  return result;
}

it("delegates a genuinely empty installation to the image entrypoint", () => {
  const data = fixture();
  const result = data.run();
  expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(data.calls, "utf8").split("\n")).toEqual([
    data.target,
    "postgres",
    "-c",
    "test.setting=1",
    "",
  ]);
  expect(existsSync(data.target)).toBe(false);
  expect(existsSync(data.staging)).toBe(false);
});

it("copies the whole cluster and WAL, removing only the copied stale PID file", () => {
  const data = fixture();
  cluster(data.legacy);
  writeFileSync(join(data.legacy, "postmaster.pid"), "123\n");
  const original = snapshot(data.legacy);
  const result = data.run();
  expect(result.status, result.stderr).toBe(0);
  expect(snapshot(data.legacy)).toEqual(original);
  const { "postmaster.pid": _pid, ...expected } = original;
  expect(snapshot(data.target)).toEqual(expected);
  expect(lstatSync(join(data.target, "base/1/12345")).mode & 0o777).toBe(0o600);
  expect(existsSync(data.staging)).toBe(false);
  expect(existsSync(data.calls)).toBe(true);
  expect(result.stdout).not.toContain("database-page-fixture");
});

it("reuses the published database without recopying an older or missing source", () => {
  const data = fixture();
  cluster(data.legacy);
  expect(data.run().status).toBe(0);
  writeFileSync(join(data.target, "base/1/new-data"), "new committed data");
  const current = snapshot(data.target);
  rmSync(data.legacy, { recursive: true });
  data.mockCopy("exit 99");
  const result = data.run();
  expect(result.status, result.stderr).toBe(0);
  expect(snapshot(data.target)).toEqual(current);
});

it("retries only its reserved partial import and accepts an empty destination", () => {
  const data = fixture();
  cluster(data.legacy);
  mkdirSync(data.staging);
  writeFileSync(join(data.staging, "partial"), "interrupted copy");
  mkdirSync(data.target);
  const result = data.run();
  expect(result.status, result.stderr).toBe(0);
  expect(snapshot(data.target)).toEqual(snapshot(data.legacy));
  expect(existsSync(join(data.target, "partial"))).toBe(false);
  expect(result.stdout).toContain("Retrying an interrupted");
});

it.each(["read failed", "No space left on device"])(
  "does not publish a partial copy after %s, and a subsequent attempt succeeds",
  (message) => {
    const data = fixture();
    cluster(data.legacy);
    const original = snapshot(data.legacy);
    data.mockCopy(
      `printf '15\\n' > "$3/PG_VERSION"\nprintf '%s\\n' '${message}' >&2\nexit 1`,
    );
    const failed = data.run();
    expect(failed.status).not.toBe(0);
    expect(failed.stderr).toContain(message);
    expect(failed.stderr).toContain("copying the stopped");
    expect(existsSync(data.target)).toBe(false);
    expect(existsSync(data.calls)).toBe(false);
    expect(snapshot(data.legacy)).toEqual(original);
    expect(existsSync(data.staging)).toBe(true);
    rmSync(join(data.root, "bin/cp"));
    const retried = data.run();
    expect(retried.status, retried.stderr).toBe(0);
    expect(snapshot(data.target)).toEqual(original);
  },
);

it("validates the staged cluster even when the copy command reports success", () => {
  const data = fixture();
  cluster(data.legacy);
  data.mockCopy('printf "15\\n" > "$3/PG_VERSION"');
  const result = data.run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("control files are missing");
  expect(existsSync(data.target)).toBe(false);
  expect(existsSync(data.calls)).toBe(false);
});

it("rejects a staged copy with a different PostgreSQL version", () => {
  const data = fixture();
  cluster(data.legacy);
  data.mockCopy('/bin/cp "$@"\nprintf "17\\n" > "$3/PG_VERSION"');
  const result = data.run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Only PostgreSQL 15");
  expect(existsSync(data.target)).toBe(false);
  expect(existsSync(data.calls)).toBe(false);
});

it.each(["legacy", "target"] as const)(
  "refuses a nonempty invalid %s instead of initializing or replacing it",
  (location) => {
    const data = fixture();
    cluster(data.legacy);
    const directory = data[location];
    if (location === "legacy") rmSync(directory, { recursive: true });
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "operator-data"), "must survive");
    const original = snapshot(directory);
    const result = data.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("no PG_VERSION");
    expect(snapshot(directory)).toEqual(original);
    expect(existsSync(data.calls)).toBe(false);
  },
);

it.each(["legacy", "target"] as const)(
  "rejects an incompatible PostgreSQL major in the %s",
  (location) => {
    const data = fixture();
    cluster(data[location]);
    writeFileSync(join(data[location], "PG_VERSION"), "17\n");
    const result = data.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Only PostgreSQL 15");
    expect(existsSync(data.calls)).toBe(false);
  },
);

it.each(["pg_wal", "pg_xact", "global/pg_control", "base/1"])(
  "rejects an incomplete source missing %s",
  (missing) => {
    const data = fixture();
    cluster(data.legacy);
    rmSync(join(data.legacy, missing), { recursive: true });
    const result = data.run();
    expect(result.status).not.toBe(0);
    expect(existsSync(data.target)).toBe(false);
    expect(existsSync(data.calls)).toBe(false);
  },
);

it.each(["pg_tblspc/1234", "base/1/link", "broken-link"])(
  "rejects source symlinks (%s) without following or modifying them",
  (name) => {
    const data = fixture();
    cluster(data.legacy);
    symlinkSync(
      join(data.root, "unmounted-external-data"),
      join(data.legacy, name),
    );
    const original = snapshot(data.legacy);
    const result = data.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Symlinks, external tablespaces");
    expect(snapshot(data.legacy)).toEqual(original);
    expect(existsSync(data.target)).toBe(false);
  },
);

it.each(["target", "staging"] as const)(
  "does not follow or remove a symlink at the %s",
  (location) => {
    const data = fixture();
    cluster(data.legacy);
    symlinkSync(data.legacy, data[location]);
    const original = snapshot(data.legacy);
    const result = data.run();
    expect(result.status).not.toBe(0);
    expect(lstatSync(data[location]).isSymbolicLink()).toBe(true);
    expect(snapshot(data.legacy)).toEqual(original);
  },
);

it("keeps an ambiguous preexisting volume intact", () => {
  const data = fixture();
  cluster(data.legacy);
  writeFileSync(join(data.volume, "operator-data"), "must survive");
  const original = snapshot(data.volume);
  const result = data.run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("unrecognized files");
  expect(snapshot(data.volume)).toEqual(original);
  expect(existsSync(data.calls)).toBe(false);
});

it("rejects a source that overlaps the data volume before deleting staging", () => {
  const data = fixture();
  mkdirSync(data.staging);
  writeFileSync(join(data.staging, "operator-data"), "must survive");
  const original = snapshot(data.volume);
  const result = data.run({ LEGACY_PGDATA: data.volume });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("must be separate directories");
  expect(snapshot(data.volume)).toEqual(original);
});

it("rejects a missing legacy mount instead of initializing a new database", () => {
  const data = fixture();
  rmSync(data.legacy, { recursive: true });
  const result = data.run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("legacy data directory is not mounted");
  expect(existsSync(data.calls)).toBe(false);
});

it("does not initialize over an interrupted import whose source disappeared", () => {
  const data = fixture();
  mkdirSync(data.staging);
  writeFileSync(join(data.staging, "partial"), "must survive");
  const result = data.run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("unfinished import");
  expect(readFileSync(join(data.staging, "partial"), "utf8")).toBe(
    "must survive",
  );
  expect(existsSync(data.calls)).toBe(false);
});
