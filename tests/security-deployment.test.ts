import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureSecuritySecrets,
  generateSecuritySecrets,
} from "../packages/xrag/update/scripts/securitySecrets";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((dir) => rm(dir, { recursive: true })),
  );
});

async function configuration(content: string) {
  const dir = await mkdtemp(join(tmpdir(), "aibox-security-"));
  directories.push(dir);
  const file = join(dir, "docker.env");
  await writeFile(file, content, { mode: 0o644 });
  return file;
}

describe("deployment secrets", () => {
  it("generates independent worker and webhook credentials for each box", () => {
    const first = generateSecuritySecrets();
    const second = generateSecuritySecrets();
    expect(first.REALTIME_SERVER_SECRET).toMatch(/^[a-f0-9]{64}$/);
    expect(first.SUPABASE_AUTH_HOOK_SECRET).toMatch(/^v1,whsec_/);
    expect(
      Buffer.from(first.SUPABASE_AUTH_HOOK_SECRET.slice(9), "base64"),
    ).toHaveLength(32);
    expect(first.REALTIME_SERVER_SECRET).not.toBe(
      second.REALTIME_SERVER_SECRET,
    );
    expect(first.SUPABASE_AUTH_HOOK_SECRET).not.toBe(
      second.SUPABASE_AUTH_HOOK_SECRET,
    );
  });

  it("upgrades an existing configuration once without rotating existing secrets", async () => {
    const file = await configuration(
      "# Existing installation\nJWT_SECRET=keep-me",
    );
    await ensureSecuritySecrets(file);
    const first = await readFile(file, "utf8");
    expect(parseEnv(first)).toMatchObject({ JWT_SECRET: "keep-me" });
    expect(parseEnv(first).REALTIME_SERVER_SECRET).toHaveLength(64);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    await ensureSecuritySecrets(file);
    expect(await readFile(file, "utf8")).toBe(first);
  });

  it.each([
    "REALTIME_SERVER_SECRET=short",
    'REALTIME_SERVER_SECRET="invalid secret with spaces despite sufficient length"',
    "SUPABASE_AUTH_HOOK_SECRET=v1,whsec_c2hvcnQ=",
  ])(
    "rejects weak existing configuration without overwriting it: %s",
    async (content) => {
      const file = await configuration(content);
      await expect(ensureSecuritySecrets(file)).rejects.toThrow(/Invalid/);
      expect(await readFile(file, "utf8")).toBe(content);
    },
  );
});

it.each([0, 17])(
  "includes older migrations, preserves exit code %i and keeps credentials out of logs",
  async (exitCode) => {
    const dir = await mkdtemp(join(tmpdir(), "aibox-migration-entrypoint-"));
    directories.push(dir);
    await mkdir(join(dir, "node_modules/.bin"), { recursive: true });
    const argsFile = join(dir, "arguments.txt");
    await writeFile(
      join(dir, "node_modules/.bin/supabase"),
      '#!/bin/sh\nprintf "%s\\n" "$@" > "$ARGUMENTS_FILE"\nexit "$MIGRATION_EXIT_CODE"\n',
      { mode: 0o755 },
    );
    const dsn =
      "postgresql://postgres:disposable-test-password@localhost/audit";
    const result = await promisify(execFile)(
      "/bin/sh",
      [
        fileURLToPath(
          new URL(
            "../packages/xrag/update/database/migration/migrate-entrypoint.sh",
            import.meta.url,
          ),
        ),
      ],
      {
        cwd: dir,
        env: {
          ...process.env,
          POSTGRES_DSN: dsn,
          ARGUMENTS_FILE: argsFile,
          MIGRATION_EXIT_CODE: String(exitCode),
        },
      },
    ).then(
      (result) => ({ ...result, code: 0 }),
      (error) => error,
    );
    expect(result.code).toBe(exitCode);
    expect(result.stdout + result.stderr).not.toContain(
      "disposable-test-password",
    );
    expect((await readFile(argsFile, "utf8")).trimEnd().split("\n")).toEqual([
      "db",
      "push",
      "--include-all",
      "--yes",
      "--db-url",
      dsn,
    ]);
  },
);

it("starts the web application independently of the migration result", async () => {
  const compose = parse(
    await readFile(
      new URL(
        "../packages/xrag/update/container/docker-compose.yml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  expect(compose.services.web.depends_on).toBeUndefined();
  expect(compose.services.realtimeyjs.depends_on.web.condition).toBe(
    "service_started",
  );
  expect(compose.services.proxy.depends_on.web.condition).toBe(
    "service_started",
  );
});

it.each([
  "$(touch /tmp/should-never-run)",
  "key&replacement",
  "key\nrole: admin",
])(
  "rejects unsafe Kong key characters before expanding the template",
  async (key) => {
    await expect(
      promisify(execFile)(
        "/bin/sh",
        [
          fileURLToPath(
            new URL(
              "../packages/xrag/update/container/volumes/api/kong-entrypoint.sh",
              import.meta.url,
            ),
          ),
        ],
        {
          env: {
            ...process.env,
            SUPABASE_ANON_KEY: key,
            SUPABASE_SERVICE_KEY: "test-service-key",
            KONG_DECLARATIVE_CONFIG: "/tmp/unused-aibox-kong.yml",
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 1,
      stderr: "Supabase API key contains invalid characters\n",
    });
  },
);
