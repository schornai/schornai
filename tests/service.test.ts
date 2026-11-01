import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { initConfig, loadConfig } from "../packages/service/src/config.ts";
import { createLogger } from "../packages/service/src/log.ts";
import { needsArtifact } from "../packages/service/src/artifacts.ts";
import { control } from "../packages/service/src/control.ts";

const dirs: string[] = [];
const cli = fileURLToPath(
  new URL("../packages/service/src/main.ts", import.meta.url),
);
const execute = promisify(execFile);
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "schornai-test-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    await control(dir, "stop").catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});
it("runs a real daemon shared by CLI start/status/logs/stop, independent of its launcher", async () => {
  const dir = await directory();
  const config = join(dir, "config.json");
  const run = (...args: string[]) =>
    execute(process.execPath, [cli, "service", ...args, "--config", config]);
  await run("init");
  expect(JSON.parse(await readFile(config, "utf8")).services).toEqual([]);
  await run("start");
  const first = JSON.parse((await run("status", "--json")).stdout);
  expect(first.state).toBe("running");
  await run("start");
  expect(JSON.parse((await run("status", "--json")).stdout).pid).toBe(
    first.pid,
  );
  expect((await run("logs")).stdout).toContain("Started services:");
  await run("stop");
  expect(JSON.parse((await run("status", "--json")).stdout).state).toBe(
    "stopped",
  );
  await run("stop");
}, 20_000);
it("never overwrites an existing config and loads credentials without putting them in config.json", async () => {
  const dir = await directory();
  const path = join(dir, "config.json");
  await initConfig(path, ["supabase"]);
  await expect(initConfig(path, [])).rejects.toMatchObject({ code: "EEXIST" });
  await writeFile(join(dir, "docker.env"), 'SERVICE_API_TOKEN="a-token"\n');
  expect((await loadConfig(path)).environment.SERVICE_API_TOKEN).toBe(
    "a-token",
  );
  expect(await readFile(path, "utf8")).not.toContain("a-token");
});
it("filters packages before downloading, including future service data", () => {
  const base = {
    id: "a".repeat(64),
    name: "test.tar",
    size: 1,
    createdAt: new Date().toISOString(),
  };
  expect(
    needsArtifact({ ...base, xrag: { xrag_version: 1, xrag_type: "setup" } }, [
      "supabase",
    ]),
  ).toBe(true);
  const whisper = {
    ...base,
    xrag: {
      xrag_version: 1 as const,
      xrag_type: "mlxWhisperModel" as const,
      meta: { name: "Whisper", identifier: "whisper" },
    },
  };
  expect(needsArtifact(whisper, ["supabase", "core"])).toBe(false);
  expect(needsArtifact(whisper, ["transcriber-mlx"])).toBe(true);
  expect(needsArtifact(whisper, ["transcriber-other"])).toBe(false);
  expect(
    needsArtifact(
      {
        ...base,
        xrag: {
          xrag_version: 1,
          xrag_type: "files",
          name: "dictionary",
          targets: ["future"],
        },
      },
      ["future"],
    ),
  ).toBe(true);
});
it("redacts provisioned secrets and rotates bounded logs", async () => {
  const dir = await directory();
  const log = createLogger(dir, {
    SERVICE_API_TOKEN: "private-sharing-token",
  });
  log("test", "Bearer private-sharing-token");
  expect(await readFile(join(dir, "logs/service.log"), "utf8")).not.toContain(
    "private-sharing-token",
  );
  await writeFile(
    join(dir, "logs/service.log"),
    "x".repeat(10 * 1024 * 1024 + 1),
  );
  log("test", "rotated");
  expect(await readFile(join(dir, "logs/service.log"), "utf8")).toContain(
    "rotated",
  );
  expect(
    (await readFile(join(dir, "logs/service.log.1"))).length,
  ).toBeGreaterThan(10 * 1024 * 1024);
});

it("ignores future artifact types and versions without rejecting the shared catalog", async () => {
  const { catalogSchema } = await import("../packages/xrag/src/schema.ts");
  const catalog = catalogSchema.parse({
    artifacts: [
      {
        id: "a".repeat(64),
        name: "agent.tar",
        size: 1,
        createdAt: new Date().toISOString(),
        xrag: {
          xrag_version: 2,
          xrag_type: "agent",
          content: { name: "Future agent" },
        },
      },
    ],
    nextOffset: null,
  });
  expect(
    needsArtifact(catalog.artifacts[0]!, ["core", "transcriber-mlx"]),
  ).toBe(false);
});
