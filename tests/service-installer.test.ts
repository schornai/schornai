import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  chmod,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installUpdate } from "../packages/service/src/installer.ts";
import { initConfig, loadConfig } from "../packages/service/src/config.ts";
import { getDirectoryIntegrity } from "../packages/xrag/update/scripts/modules/integrity.ts";
import { run } from "../packages/service/src/process.ts";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const installationMocks = vi.hoisted(() => ({ home: "" }));
vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  homedir: () => installationMocks.home,
}));
vi.mock("../packages/service/src/stopLegacyTranscriber.ts", () => ({
  stopLegacyTranscriber: vi.fn(),
}));
vi.mock("../packages/service/src/control.ts", () => ({
  control: vi.fn(async () => {
    throw Object.assign(new Error("Not running"), { code: "ENOENT" });
  }),
}));
vi.mock("../packages/service/src/process.ts", () => ({ run: vi.fn() }));
const dirs: string[] = [];
beforeEach(() => {
  vi.mocked(run).mockReset();
});
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "service-install-"));
  dirs.push(root);
  installationMocks.home = join(root, "home");
  const bundle = join(root, "bundle");
  const machine = join(root, "machine");
  await mkdir(join(bundle, "apps/service"), { recursive: true });
  await mkdir(join(bundle, "apps/transcriber-mac"));
  await mkdir(join(bundle, "bin"));
  await mkdir(join(bundle, "container"));
  await writeFile(join(bundle, "apps/service/cli.mjs"), "new service");
  await writeFile(
    join(bundle, "apps/transcriber-mac/worker"),
    "unselected worker",
  );
  const integrity = {
    apps: await getDirectoryIntegrity(join(bundle, "apps")),
    bin: await getDirectoryIntegrity(join(bundle, "bin")),
    container: await getDirectoryIntegrity(join(bundle, "container")),
  };
  await writeFile(
    join(bundle, "installation.json"),
    JSON.stringify({
      version: 1,
      platform: "different-platform",
      arch: process.arch,
      integrity,
      images: [],
    }),
  );
  const config = join(machine, "config.json");
  await initConfig(config, []);
  vi.stubEnv("SCHORNAI_CONFIG", config);
  vi.stubEnv("SCHORNAI_SERVICE_UPDATE", "1");
  await mkdir(join(machine, "apps/service"), { recursive: true });
  await writeFile(join(machine, "apps/service/cli.mjs"), "old service");
  await mkdir(join(machine, "docker/volumes/db/data"), { recursive: true });
  await writeFile(
    join(machine, "docker/volumes/db/data/keep"),
    "operator data",
  );
  return { bundle, machine, config };
}
it("updates the portable service without installing unselected services or changing configuration/data", async () => {
  const { bundle, machine, config } = await fixture();
  const before = await readFile(config, "utf8");
  await installUpdate(bundle);
  expect(await readFile(join(machine, "apps/service/cli.mjs"), "utf8")).toBe(
    "new service",
  );
  expect(
    await readFile(join(machine, "apps/service.previous/cli.mjs"), "utf8"),
  ).toBe("old service");
  expect(await readFile(config, "utf8")).toBe(before);
  expect(
    await readFile(join(machine, "docker/volumes/db/data/keep"), "utf8"),
  ).toBe("operator data");
  await expect(
    readFile(join(machine, "apps/transcriber-mac/worker")),
  ).rejects.toMatchObject({ code: "ENOENT" });
});
it("rejects setup updates before replacing or stopping a source development runtime", async () => {
  const { bundle, machine, config } = await fixture();
  const value = JSON.parse(await readFile(config, "utf8"));
  value.development = { workspace: join(machine, "checkout") };
  await writeFile(config, JSON.stringify(value));
  await expect(installUpdate(bundle)).rejects.toThrow(
    "Setup bundles install production runtimes",
  );
  expect(await readFile(join(machine, "apps/service/cli.mjs"), "utf8")).toBe(
    "old service",
  );
  expect(run).not.toHaveBeenCalled();
});
async function legacyFixture() {
  const current = await fixture();
  const { bundle, machine, config } = current;
  await rm(config);
  await rm(join(machine, "apps/service"), { recursive: true });
  await writeFile(
    join(machine, "docker/docker-compose.yml"),
    "name: supabase\nservices: {}\n",
  );
  await writeFile(
    join(machine, "docker.env"),
    "BOX_ID=00000000-0000-4000-8000-000000000009\nPOSTGRES_PASSWORD=keep-this-password\n",
  );
  for (const name of ["node", "docker", "colima", "lima", "ollama", "ffmpeg"]) {
    await mkdir(join(bundle, "bin", name));
    await writeFile(join(bundle, "bin", name, "payload"), name);
  }
  await writeFile(join(bundle, "bin/node/node"), "installed runtime");
  await mkdir(join(bundle, "apps/schorn.ai Admin.app"));
  await writeFile(
    join(bundle, "apps/schorn.ai Admin.app/launcher"),
    "new launcher",
  );
  await mkdir(join(bundle, "container/volumes"));
  await mkdir(join(bundle, "container/supabase"));
  await mkdir(join(bundle, "container/document-extractor"));
  await writeFile(
    join(bundle, "container/docker-compose.yml"),
    "name: schornai-app\nservices: {}\n",
  );
  await writeFile(join(bundle, "xrag.tar"), "legacy downloaded archive");
  const manifest = JSON.parse(
    await readFile(join(bundle, "installation.json"), "utf8"),
  );
  manifest.platform = process.platform;
  for (const part of ["apps", "bin", "container"])
    manifest.integrity[part] = await getDirectoryIntegrity(join(bundle, part));
  await writeFile(join(bundle, "installation.json"), JSON.stringify(manifest));
  vi.stubEnv("SCHORNAI_SERVICE_UPDATE", "");
  vi.mocked(run).mockResolvedValue(undefined);
  return current;
}
it("migrates an old box with no service or config directly from a current bundle, preserving credentials and starting the daemon", async () => {
  const { bundle, machine, config } = await legacyFixture();
  await writeFile(join(machine, "docker.env"), "SERVICE_API_TOKEN=\n", {
    flag: "a",
  });
  vi.stubEnv("SERVICE_API_TOKEN", undefined);
  vi.mocked(run).mockImplementation(async (command) => {
    if (!command.args.includes("service")) return;
    // A blank old value must not shadow the freshly generated file value in
    // the replacement daemon's process environment.
    expect(command.env.SERVICE_API_TOKEN).toBeUndefined();
    expect(
      (await loadConfig(config)).environment.SERVICE_API_TOKEN,
    ).toHaveLength(64);
    expect(command.env.POSTGRES_PASSWORD).toBeUndefined();
  });
  await installUpdate(bundle);
  expect(JSON.parse(await readFile(config, "utf8"))).toMatchObject({
    id: "00000000-0000-4000-8000-000000000009",
    services: [
      "supabase",
      "core",
      "ollama",
      "transcriber-mlx",
      "document-extractor",
    ],
    sharing: { url: "http://127.0.0.1:3001" },
  });
  expect(await readFile(join(machine, "docker.env"), "utf8")).toContain(
    "POSTGRES_PASSWORD=keep-this-password",
  );
  expect(await readFile(join(machine, "docker.env"), "utf8")).toContain(
    "SERVICE_API_TOKEN=",
  );
  expect(
    await readFile(join(machine, "docker/volumes/db/data/keep"), "utf8"),
  ).toBe("operator data");
  expect(
    vi
      .mocked(run)
      .mock.calls.some(
        ([command]) =>
          command.args.includes("start") && command.args.includes("service"),
      ),
  ).toBe(true);
  expect(
    vi
      .mocked(run)
      .mock.calls.find(([command]) => command.args.includes("service"))?.[0]
      .command,
  ).toBe(join(machine, "bin/node/node"));
  await expect(
    readFile(join(machine, "service-migration.json")),
  ).rejects.toMatchObject({ code: "ENOENT" });
  const id = createHash("sha256")
    .update("legacy downloaded archive")
    .digest("hex");
  expect(
    JSON.parse(await readFile(join(machine, "service-artifacts.json"), "utf8"))[
      id
    ],
  ).toBeTruthy();
  if (process.platform === "darwin")
    expect(
      await readFile(
        join(
          installationMocks.home,
          "Applications/schorn.ai Admin.app/launcher",
        ),
        "utf8",
      ),
    ).toBe("new launcher");
});
it("finishes automatic migration on retry after the old Compose layout was already replaced", async () => {
  const { bundle, machine, config } = await legacyFixture();
  const manifestPath = join(bundle, "installation.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.images = [{ file: "web.tar", services: ["core"] }];
  await writeFile(manifestPath, JSON.stringify(manifest));
  vi.mocked(run).mockImplementation(async (command) => {
    if (command.args[0] === "load") throw new Error("Image import failed");
  });
  await expect(installUpdate(bundle)).rejects.toThrow("Image import failed");
  expect(
    await readFile(join(machine, "docker/docker-compose.yml"), "utf8"),
  ).toContain("name: schornai-app");
  expect(
    await readFile(join(machine, "service-migration.json"), "utf8"),
  ).toContain("admin-app");
  const before = await readFile(config, "utf8");
  vi.mocked(run).mockReset().mockResolvedValue(undefined);
  await installUpdate(bundle);
  expect(await readFile(config, "utf8")).toBe(before);
  expect(
    vi
      .mocked(run)
      .mock.calls.some(
        ([command]) =>
          command.args.includes("service") && command.args.includes("start"),
      ),
  ).toBe(true);
  await expect(
    readFile(join(machine, "service-migration.json")),
  ).rejects.toMatchObject({ code: "ENOENT" });
});
it("does not create a migration config or stop the old system when bundle verification fails", async () => {
  const { bundle, config } = await legacyFixture();
  await writeFile(join(bundle, "apps/service/cli.mjs"), "corrupt");
  await expect(installUpdate(bundle)).rejects.toThrow(
    "Expected file integrity",
  );
  await expect(readFile(config)).rejects.toMatchObject({ code: "ENOENT" });
  expect(run).not.toHaveBeenCalled();
});
it("bootstraps with the matching bundled Node when launched exactly like an old Admin XRAG action", async () => {
  const { bundle, machine } = await fixture();
  await mkdir(join(bundle, "bin/node"));
  await writeFile(
    join(bundle, "bin/node/node"),
    "#!/bin/sh\necho current-bundled-runtime\n",
    { mode: 0o755 },
  );
  await writeFile(
    join(bundle, "runtime-platform"),
    `${process.platform}-${process.arch}\n`,
  );
  await writeFile(
    join(bundle, "setup.sh"),
    await readFile(
      new URL("../packages/xrag/update/setup.sh", import.meta.url),
    ),
  );
  await mkdir(join(machine, "bin/node"), { recursive: true });
  await writeFile(
    join(machine, "bin/node/node"),
    "#!/bin/sh\necho old-runtime\nexit 1\n",
    { mode: 0o755 },
  );
  const result = await promisify(execFile)("bash", [join(bundle, "setup.sh")], {
    cwd: tmpdir(),
    env: { ...process.env, SCHORNAI_HOME: machine, SCHORNAI_NODE: "" },
  });
  expect(result.stdout).toContain("current-bundled-runtime");
  expect(result.stdout).not.toContain("old-runtime");
});
it("rejects modified bundle contents before replacing installed files", async () => {
  const { bundle, machine } = await fixture();
  await writeFile(join(bundle, "apps/service/cli.mjs"), "corrupt");
  await expect(installUpdate(bundle)).rejects.toThrow(
    "Expected file integrity",
  );
  expect(await readFile(join(machine, "apps/service/cli.mjs"), "utf8")).toBe(
    "old service",
  );
});
it.skipIf(process.getuid?.() === 0)(
  "preserves a protected old app backup instead of failing the next update",
  async () => {
    const { bundle, machine } = await fixture();
    const previous = join(machine, "apps/service.previous");
    await mkdir(previous);
    await writeFile(join(previous, "legacy"), "protected legacy payload");
    await chmod(previous, 0o555);
    try {
      await installUpdate(bundle);
      const preserved = (await readdir(join(machine, "apps"))).find((name) =>
        name.startsWith("service.previous-"),
      );
      expect(preserved).toBeDefined();
      expect(
        await readFile(join(machine, "apps", preserved!, "legacy"), "utf8"),
      ).toBe("protected legacy payload");
      expect(
        await readFile(join(machine, "apps/service/cli.mjs"), "utf8"),
      ).toBe("new service");
    } finally {
      for (const name of await readdir(join(machine, "apps")))
        if (name.startsWith("service.previous"))
          await chmod(join(machine, "apps", name), 0o755);
    }
  },
);
it("restores Docker after the legacy launcher quits before removing its old containers", async () => {
  const { bundle, machine, config } = await fixture();
  const configuration = JSON.parse(await readFile(config, "utf8"));
  configuration.docker.manageColima = true;
  await writeFile(config, JSON.stringify(configuration));
  await writeFile(
    join(machine, "docker/docker-compose.yml"),
    "name: supabase\nservices: {}\n",
  );
  let online = false;
  const events: string[] = [];
  vi.mocked(run).mockImplementation(async (command) => {
    if (command.command === "osascript") {
      events.push("quit");
      online = false;
    } else if (command.name === "docker") {
      events.push("probe");
      if (!online) throw new Error("Docker unavailable");
    } else if (command.name === "colima") {
      events.push(command.args[0]!);
      online = command.args[0] === "start";
    } else if (command.args.includes("down")) {
      expect(online).toBe(true);
      expect(command.args).not.toContain("-v");
      events.push("down");
    }
  });
  await installUpdate(bundle);
  expect(events).toEqual([
    ...(process.platform === "darwin" ? ["quit"] : []),
    "probe",
    "start",
    "down",
    "stop",
  ]);
  expect(
    await readFile(join(machine, "docker/volumes/db/data/keep"), "utf8"),
  ).toBe("operator data");
});
it("honors the supplied bootstrap Node instead of an older installed runtime", async () => {
  const { machine } = await fixture();
  await mkdir(join(machine, "bin/node"), { recursive: true });
  await writeFile(
    join(machine, "bin/node/node"),
    "#!/bin/sh\necho old-runtime\nexit 1\n",
    { mode: 0o755 },
  );
  const bootstrap = join(machine, "bootstrap-node");
  await writeFile(bootstrap, "#!/bin/sh\necho bundle-runtime\n", {
    mode: 0o755,
  });
  const script = fileURLToPath(
    new URL("../packages/xrag/update/setup.sh", import.meta.url),
  );
  const result = await promisify(execFile)("bash", [script], {
    env: { ...process.env, SCHORNAI_HOME: machine, SCHORNAI_NODE: bootstrap },
  });
  expect(result.stdout).toContain("bundle-runtime");
  expect(result.stdout).not.toContain("old-runtime");
});
