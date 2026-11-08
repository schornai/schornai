import { cp, mkdir, readFile, rm, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import {
  configSchema,
  defaultConfigPath,
  loadConfig,
  resolveFrom,
  saveInitialConfig,
} from "./config.ts";
import { writeJson } from "./files.ts";
import { stopLegacyTranscriber } from "./stopLegacyTranscriber.ts";
import { createLogger } from "./log.ts";
import { run } from "./process.ts";
import { control } from "./control.ts";
import { binary, ensureDocker } from "./docker.ts";
import { setTimeout as delay } from "node:timers/promises";
import {
  checkIntegrity,
  getDirectoryIntegrity,
  getFileIntegrity,
  type DirectoryIntegrity,
} from "../../xrag/update/scripts/modules/integrity.ts";
import { activateArtifactDirectory } from "./activateArtifactDirectory.ts";
import { ensureSecuritySecrets } from "../../xrag/update/scripts/securitySecrets.ts";

export type InstallationManifest = {
  version: 1;
  platform: string;
  arch: string;
  integrity: {
    apps: DirectoryIntegrity;
    bin: DirectoryIntegrity;
    container: DirectoryIntegrity;
  };
  images: { file: string; services: string[] }[];
};

export async function hasLegacyLayout(root: string) {
  try {
    return /^name:\s*supabase\s*$/m.test(
      await readFile(join(root, "docker/docker-compose.yml"), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return false;
  }
}

export async function installUpdate(bundle: string) {
  const configPath = resolve(
    process.env.SCHORNAI_CONFIG ?? defaultConfigPath(),
  );
  const root = dirname(configPath);
  const legacyCompose = join(root, "docker/docker-compose.yml");
  const legacyLayout = await hasLegacyLayout(root);
  const migrationFile = join(root, "service-migration.json");
  const legacy = legacyLayout || existsSync(migrationFile);
  const createConfig = !existsSync(configPath);
  // Old Admin releases know only setup.sh and docker.env. Keep this bootstrap
  // in every bundle so an old box can skip any number of intermediate releases.
  const legacyEnvironment =
    createConfig && legacy
      ? parseEnv(await readFile(join(root, "docker.env"), "utf8"))
      : undefined;
  const initialConfig = legacyEnvironment
    ? configSchema.parse({
        version: 1,
        id: legacyEnvironment.BOX_ID || randomUUID(),
        services: [
          "supabase",
          "core",
          "ollama",
          "transcriber-mlx",
          "document-extractor",
        ],
        docker: { manageColima: process.platform === "darwin" },
        sharing: { url: "http://127.0.0.1:3001" },
      })
    : undefined;
  const context = await loadConfig(configPath, initialConfig);
  const { config } = context;
  if (config.development)
    throw new Error(
      "Setup bundles install production runtimes. Stop development and use a separate installation config to test setup updates.",
    );
  const manifest = JSON.parse(
    await readFile(join(bundle, "installation.json"), "utf8"),
  ) as InstallationManifest;
  if (manifest.version !== 1)
    throw new Error("Unsupported installation bundle");
  // Verify everything before stopping services or replacing the first installed file.
  for (const part of ["apps", "bin", "container"] as const)
    checkIntegrity(
      manifest.integrity[part],
      await getDirectoryIntegrity(join(bundle, part)),
    );
  const native = config.services.some((service) =>
    ["transcriber-mlx", "ollama"].includes(service),
  );
  const compatible =
    manifest.platform === process.platform && manifest.arch === process.arch;
  if (native && !compatible)
    throw new Error("This bundle's native binaries do not match this machine");
  const hasDocker = config.services.some((service) =>
    ["supabase", "core", "document-extractor"].includes(service),
  );
  if (hasDocker && manifest.arch !== process.arch)
    throw new Error("Docker image architecture does not match this machine");
  // A retry must still finish migration after the old Compose file was replaced.
  if (legacy) await writeJson(migrationFile, { version: 1, from: "admin-app" });
  if (createConfig) await saveInitialConfig(configPath, config);
  const log = createLogger(root, context.environment);
  const dockerEnvironment = {
    ...context.environment,
    PATH: `${join(root, "bin/docker")}:${join(root, "bin/lima/bin")}:${context.environment.PATH ?? "/usr/bin:/bin:/opt/homebrew/bin"}`,
  };
  const cli = join(root, "apps/service/cli.mjs");
  const managed = process.env.SCHORNAI_SERVICE_UPDATE === "1";
  let resume = false;
  if (!managed) {
    try {
      await control(root, "status");
      resume = true;
      await control(root, "stop");
    } catch (error) {
      if (
        !["ENOENT", "ECONNREFUSED"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        throw error;
    }
    if (resume) {
      const deadline = Date.now() + 120_000;
      while (true) {
        try {
          await control(root, "status");
        } catch (error) {
          if (
            ["ENOENT", "ECONNREFUSED"].includes(
              (error as NodeJS.ErrnoException).code ?? "",
            )
          )
            break;
          throw error;
        }
        if (Date.now() > deadline)
          throw new Error("Service did not stop for update");
        await delay(250);
      }
    }
  }
  if (legacyLayout) {
    if (process.platform === "darwin")
      await run(
        {
          name: "setup",
          command: "osascript",
          args: [
            "-e",
            'if application "schorn.ai Admin" is running then tell application "schorn.ai Admin" to quit',
            "-e",
            "repeat 300 times",
            "-e",
            'if not (application "schorn.ai Admin" is running) then return',
            "-e",
            "delay 0.2",
            "-e",
            "end repeat",
            "-e",
            'error "Legacy Admin app did not quit"',
          ],
          env: context.environment,
        },
        log,
      );
    await stopLegacyTranscriber(root, log);
    const legacyDocker = join(root, "bin/docker/docker-compose");
    // The legacy app owns a foreground Colima process and stops it on quit.
    const legacyColima = await ensureDocker(context, dockerEnvironment, log);
    try {
      await run(
        {
          name: "setup",
          command: existsSync(legacyDocker) ? legacyDocker : "docker",
          args: [
            ...(existsSync(legacyDocker) ? [] : ["compose"]),
            "--project-directory",
            join(root, "docker"),
            "--env-file",
            resolveFrom(root, config.envFile),
            "-f",
            legacyCompose,
            "down",
          ],
          env: dockerEnvironment,
        },
        log,
      );
    } finally {
      if (legacyColima) await run({ ...legacyColima, args: ["stop"] }, log);
    }
  }
  if (config.services.some((service) => ["supabase", "core"].includes(service)))
    await ensureSecuritySecrets(resolveFrom(root, config.envFile));
  await mkdir(join(root, "apps"), { recursive: true });
  await mkdir(join(root, "bin"), { recursive: true });
  if (compatible) {
    const bins = new Set([
      "node",
      ...(hasDocker
        ? ["docker", ...(config.docker.manageColima ? ["colima", "lima"] : [])]
        : []),
      ...(config.services.includes("ollama") ? ["ollama"] : []),
      ...(config.services.includes("transcriber-mlx") ? ["ffmpeg"] : []),
    ]);
    for (const name of bins) {
      // Linux/container-only bundles use the host's Node, Docker and Ollama.
      // Mac bundles carry these runtimes and replace them together with the app.
      if (existsSync(join(bundle, "bin", name)))
        await activateArtifactDirectory(
          join(bundle, "bin", name),
          join(root, "bin", name),
        );
    }
  }
  if (config.services.includes("transcriber-mlx"))
    await activateArtifactDirectory(
      join(bundle, "apps/transcriber-mac"),
      join(root, "apps/transcriber-mac"),
    );
  if (hasDocker) {
    const docker = join(root, "docker");
    await mkdir(docker, { recursive: true });
    // Only configuration is copied. Existing PGDATA, storage, certificates and keys remain in place.
    await cp(join(bundle, "container/volumes"), join(docker, "volumes"), {
      recursive: true,
      verbatimSymlinks: true,
    });
    await cp(
      join(bundle, "container/docker-compose.yml"),
      join(docker, "docker-compose.yml"),
    );
    await cp(join(bundle, "container/supabase"), join(docker, "supabase"), {
      recursive: true,
    });
    await cp(
      join(bundle, "container/document-extractor"),
      join(docker, "document-extractor"),
      {
        recursive: true,
      },
    );
    const dockerBin = join(root, "bin/docker/docker");
    const colima = await ensureDocker(context, dockerEnvironment, log);
    try {
      for (const image of manifest.images) {
        if (
          !image.services.some((service) =>
            config.services.includes(
              service as (typeof config.services)[number],
            ),
          )
        )
          continue;
        if (!/^[A-Za-z0-9_.-]+\.tar$/.test(image.file))
          throw new Error("Invalid image archive name");
        await run(
          {
            name: "setup",
            command: existsSync(dockerBin) ? dockerBin : "docker",
            args: [
              "load",
              "--input",
              join(bundle, "container/images", image.file),
            ],
            env: dockerEnvironment,
          },
          log,
        );
      }
    } finally {
      if (colima) await run({ ...colima, args: ["stop"] }, log);
    }
  }
  // The Mac launcher is optional; headless hosts never install or launch a GUI.
  const appPath = join(homedir(), "Applications/schorn.ai Admin.app");
  if (
    compatible &&
    process.platform === "darwin" &&
    existsSync(join(bundle, "apps/schorn.ai Admin.app")) &&
    (legacy || existsSync(appPath))
  ) {
    await mkdir(dirname(appPath), { recursive: true });
    await access(join(bundle, "apps/schorn.ai Admin.app"));
    await activateArtifactDirectory(
      join(bundle, "apps/schorn.ai Admin.app"),
      appPath,
    );
  }
  await activateArtifactDirectory(
    join(bundle, "apps/service"),
    join(root, "apps/service"),
  );
  log("setup", "Update finished");
  // An old Admin download includes xrag.tar in its extracted working folder.
  // Record it before starting the daemon to avoid immediately installing it again.
  if (legacy && existsSync(join(bundle, "xrag.tar"))) {
    const { hash } = await getFileIntegrity(join(bundle, "xrag.tar"));
    const state = join(root, "service-artifacts.json");
    let installed = {};
    try {
      installed = JSON.parse(await readFile(state, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await writeJson(state, { ...installed, [hash]: new Date().toISOString() });
  }
  if ((resume || legacy) && !managed)
    await run(
      {
        name: "setup",
        command: binary(root, "node", process.execPath),
        args: [cli, "service", "start", "--config", context.configPath],
        env: process.env,
      },
      log,
    );
  if (legacy) await rm(migrationFile);
}
