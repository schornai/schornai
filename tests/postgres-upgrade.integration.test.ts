import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { parse } from "yaml";

// Opt in with SCHORNAI_TEST_POSTGRES_UPGRADE=1. All containers, volumes and data
// belong to a unique disposable project; no installed stack is used or stopped.
it.skipIf(process.env.SCHORNAI_TEST_POSTGRES_UPGRADE !== "1")(
  "upgrades a running bind-mounted PostgreSQL 15 cluster through Compose and retains new writes on restart",
  async () => {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const project = `schornai-pg-test-${randomUUID().slice(0, 8)}`;
    // Colima shares the user's home; arbitrary host /tmp paths may not be shared.
    const temporary = await mkdtemp(join(root, ".postgres-upgrade-test-"));
    const legacy = join(temporary, "legacy");
    const composeFile = join(temporary, "compose.json");
    const seed = `${project}-seed`;
    const container = `${project}-db`;
    const scripts = join(root, "packages/xrag/update/container/volumes/db");
    const production = parse(
      (
        await readFile(
          join(root, "packages/xrag/update/container/supabase/overrides.yml"),
          "utf8",
        )
      ).replaceAll("!override", ""),
    ).services.db;
    const image = production.image as string;
    expect(production.volumes).toEqual(
      expect.arrayContaining([
        "./volumes/db/data:/legacy-pgdata:ro,z",
        "db-data:/var/lib/postgresql/data",
        "./volumes/db/prepare-data.sh:/prepare-data.sh:ro,z",
      ]),
    );
    const docker = async (...args: string[]) => {
      const { stdout } = await promisify(execFile)("docker", args, {
        timeout: 90_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      return stdout.trim();
    };
    const compose = (...args: string[]) =>
      docker("compose", "-p", project, "-f", composeFile, ...args);
    const sql = (statement: string) =>
      docker(
        "exec",
        "-u",
        "postgres",
        container,
        "psql",
        "-X",
        "-h",
        "localhost",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-Atc",
        statement,
      );
    const configuration = (upgraded: boolean) => {
      const data = upgraded
        ? production.environment.PGDATA
        : "/var/lib/postgresql/data";
      return {
        services: {
          db: {
            image,
            container_name: container,
            network_mode: "none",
            entrypoint: upgraded
              ? production.entrypoint
              : ["docker-entrypoint.sh"],
            command: [
              ...production.command.map((value: string) =>
                value.startsWith("data_directory=")
                  ? `data_directory=${data}`
                  : value,
              ),
              "-c",
              `hba_file=${data}/pg_hba.conf`,
              "-c",
              `ident_file=${data}/pg_ident.conf`,
              // The fixture contains a small vanilla cluster, not Supabase's
              // extension schemas. Keep the real image/config/entrypoint.
              "-c",
              "shared_preload_libraries=",
              "-c",
              "shared_buffers=32MB",
              "-c",
              "max_connections=20",
              "-c",
              "log_destination=stderr",
            ],
            environment: { PGDATA: data, POSTGRES_DB: "postgres" },
            volumes: [
              ...(upgraded
                ? [
                    `${legacy}:/legacy-pgdata:ro,z`,
                    "data:/var/lib/postgresql/data",
                    `${scripts}/prepare-data.sh:/prepare-data.sh:ro,z`,
                  ]
                : [`${legacy}:/var/lib/postgresql/data:Z`]),
              `${scripts}/check-health.sh:/check-health.sh:ro,z`,
            ],
            stop_grace_period: production.stop_grace_period,
            healthcheck: { ...production.healthcheck, interval: "1s" },
          },
        },
        volumes: { data: {} },
      };
    };
    await mkdir(legacy);
    await writeFile(composeFile, JSON.stringify(configuration(false)));
    try {
      await docker("image", "inspect", image, "--format", "{{.Id}}");
      // Prepare data without running the image's unrelated Supabase bootstrap.
      await docker(
        "run",
        "-d",
        "--name",
        seed,
        "--network",
        "none",
        "--pull",
        "never",
        "-v",
        `${legacy}:/legacy-pgdata:z`,
        "-v",
        "/seed-data",
        "--entrypoint",
        "sleep",
        image,
        "240",
      );
      await docker("exec", seed, "chown", "postgres:postgres", "/seed-data");
      await docker(
        "exec",
        "-u",
        "postgres",
        seed,
        "initdb",
        "-D",
        "/seed-data",
        "--no-locale",
        "-E",
        "UTF8",
        "-A",
        "trust",
      );
      // initdb requires chmod support. Seed on Linux storage, then place the
      // stopped legacy fixture on the host mount, as an existing box would.
      await docker("exec", seed, "cp", "-a", "/seed-data/.", "/legacy-pgdata/");
      await docker("rm", "-f", "-v", seed);
      await compose("up", "-d", "--wait", "--wait-timeout", "60", "db");
      await sql(
        "CREATE TABLE migration_sentinel(value integer); INSERT INTO migration_sentinel VALUES (42);",
      );
      const oldId = await docker("inspect", "--format", "{{.Id}}", container);

      await writeFile(composeFile, JSON.stringify(configuration(true)));
      // No manual stop: this exercises the updater's normal Compose recreation.
      await compose("up", "-d", "--wait", "--wait-timeout", "60", "db");
      expect(
        await docker("inspect", "--format", "{{.Id}}", container),
      ).not.toBe(oldId);
      expect(await sql("SELECT value FROM migration_sentinel")).toBe("42");
      expect(await sql("SHOW data_directory")).toBe(
        production.environment.PGDATA,
      );
      const sourceFingerprint = () =>
        docker(
          "exec",
          container,
          "sh",
          "-c",
          "find /legacy-pgdata -type f -exec sha256sum '{}' + | sort",
        );
      const original = await sourceFingerprint();
      await sql("INSERT INTO migration_sentinel VALUES (99)");
      await compose("restart", "db");
      await compose("up", "-d", "--wait", "--wait-timeout", "60", "db");
      expect(
        await sql(
          "SELECT string_agg(value::text, ',' ORDER BY value) FROM migration_sentinel",
        ),
      ).toBe("42,99");
      expect(await sourceFingerprint()).toBe(original);
      await docker("exec", container, "sh", "/check-health.sh");
    } catch (error) {
      const logs = await compose(
        "logs",
        "--no-color",
        "--tail",
        "60",
        "db",
      ).catch(() => "");
      throw new Error(`PostgreSQL upgrade fixture failed:\n${logs}`, {
        cause: error,
      });
    } finally {
      await docker("rm", "-f", "-v", seed).catch(() => {});
      await compose("down", "--volumes", "--remove-orphans");
      // Linux host files may belong to the image's numeric postgres UID.
      await docker(
        "run",
        "--rm",
        "--network",
        "none",
        "--pull",
        "never",
        "-v",
        `${legacy}:/cleanup:z`,
        "--entrypoint",
        "sh",
        image,
        "-c",
        "find /cleanup -mindepth 1 -maxdepth 1 -exec rm -rf '{}' +",
      );
      await rm(temporary, { recursive: true, force: true });
    }
  },
  180_000,
);
