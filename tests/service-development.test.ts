import { execFile, spawn } from "node:child_process";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, it, vi } from "vitest";
import { configSchema, loadConfig } from "../packages/service/src/config.ts";
import { serviceCommands } from "../packages/service/src/serviceCommands.ts";
import { control } from "../packages/service/src/control.ts";

const execute = promisify(execFile);
const cli = fileURLToPath(
  new URL("../packages/service/src/main.ts", import.meta.url),
);
const dev = fileURLToPath(
  new URL("../packages/service/src/dev.ts", import.meta.url),
);
const roots: string[] = [];
async function fixture(services = ["core"]) {
  const root = await mkdtemp(join(tmpdir(), "service-dev-"));
  roots.push(root);
  const workspace = join(root, "workspace");
  await mkdir(workspace);
  const configPath = join(root, "config.json");
  const config = configSchema.parse({
    version: 1,
    id: "00000000-0000-4000-8000-000000000002",
    services,
    development: { workspace },
  });
  await writeFile(configPath, JSON.stringify(config));
  return { root, workspace, configPath, config };
}
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await execute(process.execPath, [
      cli,
      "service",
      "stop",
      "--config",
      join(root, "config.json"),
    ]).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});

it("uses workspace env files with shared overrides and keeps production service selection", async () => {
  vi.stubEnv("REALTIME_SERVER_SECRET", undefined);
  vi.stubEnv("SUPABASE_URL", undefined);
  const { root, workspace, configPath } = await fixture();
  for (const app of ["web", "realtime", "transcriber-mac"])
    await mkdir(join(workspace, "apps", app), { recursive: true });
  await writeFile(
    join(workspace, "apps/web/.env"),
    "SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_PUBLIC_ANON_KEY=web-anon\nPRIORITY=base\n",
  );
  await writeFile(
    join(workspace, "apps/web/.env.development"),
    "PRIORITY=development\n",
  );
  await writeFile(join(workspace, "apps/web/.env.local"), "PRIORITY=local\n");
  await writeFile(
    join(workspace, "apps/web/.env.development.local"),
    "PRIORITY=development-local\n",
  );
  await writeFile(
    join(workspace, "apps/realtime/.env"),
    "REALTIME_SERVER_SECRET=old-realtime-secret\n",
  );
  await writeFile(
    join(root, "docker.env"),
    "REALTIME_SERVER_SECRET=shared-development-secret\nANON_KEY=shared-anon\n",
  );
  const context = await loadConfig(configPath);
  const plan = serviceCommands(context);
  expect(plan.native.map(({ name }) => name)).toEqual(["web", "realtime"]);
  expect(plan.native[0]).toMatchObject({
    command: "npm",
    cwd: workspace,
    args: ["run", "dev", "--workspace", "apps/web"],
  });
  expect(plan.native[0]!.env).toMatchObject({
    PRIORITY: "development-local",
    SUPABASE_PUBLIC_ANON_KEY: "shared-anon",
    REALTIME_SERVER_SECRET: "shared-development-secret",
    SCHORNAI_HOME: root,
  });
  expect(plan.native[1]!.env.OLLAMA_MODELS).toBe(join(root, "ollama/models"));
  expect(plan.compose[0]!.spec.env.AIBOX_SUPABASE_PROXY_URL).toBe(
    "http://host.docker.internal:54321",
  );
  expect(plan.compose[0]!.services).toEqual(["web-app-dev"]);
  context.config.services = ["supabase"];
  const database = serviceCommands(context);
  expect(database.native).toEqual([]);
  expect(database.compose).toEqual([]);
  expect(database.localSupabase).toMatchObject({
    command: "npx",
    args: ["--yes", "supabase@2.120.0"],
    cwd: workspace,
  });
});

it("starts real source watchers through the same daemon, reloads code, redacts logs and stops their descendants", async () => {
  vi.stubEnv("REALTIME_SERVER_SECRET", undefined);
  const { root, workspace, configPath } = await fixture();
  await writeFile(
    join(workspace, "package.json"),
    JSON.stringify({ private: true, workspaces: ["apps/*"] }),
  );
  const source = (
    app: string,
    generation: number,
  ) => `import {writeFileSync} from 'node:fs';
writeFileSync(${JSON.stringify(join(root, `${app}.json`))},JSON.stringify({pid:process.pid,generation:${generation}}));
console.log(process.env.REALTIME_SERVER_SECRET);
setInterval(()=>{},1000);`;
  for (const app of ["web", "realtime"]) {
    await mkdir(join(workspace, "apps", app), { recursive: true });
    await writeFile(
      join(workspace, "apps", app, "package.json"),
      JSON.stringify({
        name: `dev-test-${app}`,
        private: true,
        scripts: { dev: "node --watch server.mjs" },
      }),
    );
    await writeFile(join(workspace, "apps", app, "server.mjs"), source(app, 1));
    await writeFile(
      join(workspace, "apps", app, ".env"),
      "REALTIME_SERVER_SECRET=secret-from-workspace-env\n",
    );
  }
  // Replace only the external Docker boundary; npm, watchers, source processes,
  // daemon sockets, logs and shutdown run exactly as they do in development.
  const docker = join(root, "bin/docker/docker");
  await mkdir(dirname(docker), { recursive: true });
  await writeFile(
    docker,
    `#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(join(root, "docker-commands"))},JSON.stringify(process.argv.slice(2))+'\\n'); if(process.argv.includes('stop')) setTimeout(()=>{},500);\n`,
    { mode: 0o755 },
  );
  const run = (...args: string[]) =>
    execute(process.execPath, [
      cli,
      "service",
      ...args,
      "--config",
      configPath,
    ]);
  await run("start");
  const read = async (app: string) =>
    JSON.parse(await readFile(join(root, `${app}.json`), "utf8")) as {
      pid: number;
      generation: number;
    };
  await expect
    .poll(async () => (await read("web").catch(() => undefined))?.generation, {
      timeout: 10_000,
    })
    .toBe(1);
  await expect
    .poll(
      async () => (await read("realtime").catch(() => undefined))?.generation,
    )
    .toBe(1);
  const before = await read("web");
  const realtime = await read("realtime");
  await writeFile(join(workspace, "apps/web/server.mjs"), source("web", 2));
  await expect
    .poll(async () => (await read("web")).generation, { timeout: 10_000 })
    .toBe(2);
  const after = await read("web");
  expect(after.pid).not.toBe(before.pid);
  expect(await read("realtime")).toEqual(realtime);
  const logs = (await run("logs", "--lines", "1000")).stdout;
  expect(logs).toContain("[redacted]");
  expect(logs).not.toContain("secret-from-workspace-env");
  const { pid } = await control(root, "status");
  process.kill(pid, "SIGINT");
  await delay(50);
  process.kill(pid, "SIGINT");
  await run("stop");
  await expect(access(join(root, ".service-lock"))).rejects.toMatchObject({
    code: "ENOENT",
  });
  for (const pid of [before.pid, after.pid, realtime.pid])
    expect(() => process.kill(pid, 0)).toThrow();
  expect(await readFile(join(root, "docker-commands"), "utf8")).toContain(
    '"stop","--timeout","30"',
  );
}, 30_000);

it("creates an isolated dev config and accepts identical initial roles again after a watch restart", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-dev-bootstrap-"));
  roots.push(root);
  const config = join(root, "config.json");
  let initial: string | undefined;
  for (let pass = 0; pass < 2; pass++) {
    const child = spawn(
      process.execPath,
      [dev, "--config", config, "--services", ""],
      { stdio: "ignore" },
    );
    const ended = new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    try {
      await expect
        .poll(
          async () =>
            (await control(root, "status").catch(() => undefined))?.state,
        )
        .toBe("running");
      const current = await readFile(config, "utf8");
      if (initial) expect(current).toBe(initial);
      initial = current;
      expect(JSON.parse(current).development.workspace).toBe(
        fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, ""),
      );
      await control(root, "stop");
      expect(await ended).toBe(0);
    } finally {
      child.kill("SIGTERM");
      await ended;
    }
  }
  await expect(
    execute(process.execPath, [dev, "--config", config, "--services", "core"]),
  ).rejects.toThrow("Configuration already exists");
});
