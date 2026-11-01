import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { copy } from "./scripts/modules/copy.mts";
import { getBundlePaths } from "./scripts/modules/getBundlePaths.mts";
import {
  getDirectoryIntegrity,
  getFileIntegrity,
} from "./scripts/modules/integrity.ts";
import type { UpdateIntegrity } from "./scripts/modules/integrity.ts";
import { run } from "./scripts/modules/run.mts";
import {
  buildEnvironment,
  copyBuildSources,
  getBuildTarget,
} from "./build/workspace.mts";
import { bundleImages, getBundleImages } from "./build/images.mts";

export async function bundleUpdate({
  projectDir = resolve(import.meta.dirname, "../../.."),
  platform = process.platform as string,
  arch = process.arch as string,
  runCommand = run,
} = {}) {
  const { includesMacRuntime, dockerPlatform } = getBuildTarget(platform, arch);
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node.js 24 or newer is required.");
  console.log(`Bundle update for ${platform}/${arch} (${dockerPlatform})...`);

  // Fail before expensive downloads/builds, without touching running services.
  await runCommand("git", ["--version"]);
  const { stdout: npmVersion } = await runCommand("npm", ["--version"]);
  await runCommand("tar", ["--version"]);
  const { stdout: server } = await runCommand(
    "docker",
    ["version", "--format", "{{json .Server}}"],
    { quiet: true },
  );
  const docker = JSON.parse(server) as { Os: string; ApiVersion: string };
  // image inspect --platform needs API 1.49 (Docker Engine 28.1+).
  const [apiMajor = 0, apiMinor = 0] = docker.ApiVersion.split(".").map(Number);
  if (
    docker.Os !== "linux" ||
    apiMajor < 1 ||
    (apiMajor === 1 && apiMinor < 49)
  )
    throw new Error(
      "A running Linux Docker Engine 28.1+ (API 1.49+) is required.",
    );
  await runCommand("docker", ["compose", "version"]);
  await runCommand("docker", ["buildx", "version"]);
  if (includesMacRuntime) {
    await runCommand("python3.13", ["--version"]);
    await runCommand("xcrun", ["--find", "clang"]);
    await runCommand("unzip", ["-v"], { quiet: true });
  }

  const temporaryRoot = join(projectDir, ".xrag-build");
  await mkdir(temporaryRoot, { recursive: true });
  const workDir = await mkdtemp(join(temporaryRoot, "bundle-"));
  let sources: string | undefined;
  try {
    // Outside the checkout so Node cannot fall back to its ancestor node_modules.
    sources = await mkdtemp(join(tmpdir(), "aibox-xrag-source-"));
    const payload = join(workDir, "payload");
    const bundle = getBundlePaths(payload);
    const updateDir = join(sources, "packages/xrag/update");
    console.log(
      "Snapshot current sources (including uncommitted changes), without local build artifacts...",
    );
    await copyBuildSources(projectDir, sources);
    const images = await getBundleImages(sources, runCommand);
    const env = buildEnvironment();
    await runCommand(
      "npm",
      [
        "ci",
        "--include=dev",
        "--ignore-scripts=false",
        "--no-audit",
        "--no-fund",
      ],
      { cwd: sources, env },
    );
    const build = (script: string) =>
      runCommand("npm", ["run", script], { cwd: sources, env });

    for (const dir of [
      bundle.appsDir,
      bundle.binDir,
      bundle.scriptsDir,
      bundle.containerImagesDir,
      bundle.containerVolumesDir,
    ])
      await mkdir(dir, { recursive: true });
    await writeFile(
      join(payload, "xrag.json"),
      JSON.stringify({ xrag_type: "setup", xrag_version: 1, platform, arch }),
    );
    await writeFile(join(payload, "runtime-platform"), `${platform}-${arch}\n`);
    await copy(join(updateDir, "setup.sh"), join(payload, "setup.sh"));
    await copy(join(updateDir, "update.mts"), join(payload, "update.mts"));
    await copy(join(updateDir, "scripts"), bundle.scriptsDir, {
      recursive: true,
    });
    for (const directory of ["volumes", "supabase", "document-extractor"])
      await copy(
        join(updateDir, "container", directory),
        join(bundle.containerEnvironmentDir, directory),
        { recursive: true },
      );
    await copy(
      join(updateDir, "container/docker-compose.yml"),
      bundle.containerEnvironmentComposeYml,
    );

    await build("build:app:realtime");
    await access(join(sources, "apps/realtime/dist/rollup/appRealtime.js"));
    await build("build:service");
    await copy(
      join(sources, "packages/service/dist"),
      join(bundle.appsDir, "service"),
      { recursive: true },
    );
    for (const entry of ["cli.mjs", "commands.mjs", "installer.mjs"])
      await access(join(bundle.appsDir, "service", entry));

    if (includesMacRuntime) {
      await build("external:downloads");
      await copy(join(sources, "external/downloads/dist"), bundle.binDir, {
        recursive: true,
      });
      await runCommand(
        "npm",
        ["run", "python:install", "--workspace", "apps/transcriber-mac"],
        { cwd: sources, env },
      );
      await build("build:app:transcriberMac");
      const transcriber = join(bundle.appsDir, "transcriber-mac");
      await mkdir(join(transcriber, "dist"), { recursive: true });
      await copy(
        join(sources, "apps/transcriber-mac/dist/rollup/appTranscriberMac.js"),
        join(transcriber, "appTranscriberMac.js"),
      );
      await copy(
        join(sources, "apps/transcriber-mac/dist/transcribe-worker"),
        join(transcriber, "dist/transcribe-worker"),
        { recursive: true },
      );
      await runCommand("npm", ["run", "package"], {
        cwd: join(sources, "apps/admin-mac"),
        env: {
          ...env,
          npm_config_user_agent: `npm/${npmVersion.trim()} node/${process.version}`,
        },
      });
      await copy(
        join(sources, "apps/admin-mac/out/schorn.ai Admin-darwin-arm64"),
        bundle.appsDir,
        { recursive: true },
      );
    }

    const containerImages = await bundleImages(
      sources,
      bundle.containerImagesDir,
      dockerPlatform,
      images,
      runCommand,
    );
    const integrity: UpdateIntegrity = {
      apps: await getDirectoryIntegrity(bundle.appsDir),
      bin: await getDirectoryIntegrity(bundle.binDir),
      scripts: await getDirectoryIntegrity(bundle.scriptsDir),
      containerVolumes: await getDirectoryIntegrity(bundle.containerVolumesDir),
      dockerCompose: await getFileIntegrity(
        bundle.containerEnvironmentComposeYml,
      ),
      containerImages,
    };
    await writeFile(join(payload, "integrity.json"), JSON.stringify(integrity));
    await writeFile(
      join(payload, "installation.json"),
      JSON.stringify({
        version: 1,
        platform,
        arch,
        integrity: {
          apps: integrity.apps,
          bin: integrity.bin,
          container: await getDirectoryIntegrity(
            bundle.containerEnvironmentDir,
          ),
        },
        images: images.map(({ file, services }) => ({ file, services })),
      }),
    );
    // Record exactly which manifests/toolchain this bundle used, without embedding local paths/env.
    await writeFile(
      join(payload, "build.json"),
      JSON.stringify(
        {
          version: 1,
          platform,
          arch,
          node: process.version,
          npm: npmVersion.trim(),
          packageLock: await getFileIntegrity(
            join(sources, "package-lock.json"),
          ),
          pythonRequirements: includesMacRuntime
            ? await readFile(
                join(sources, "apps/transcriber-mac/requirements.txt"),
                "utf8",
              )
            : undefined,
          images: containerImages,
        },
        null,
        2,
      ),
    );
    const archive = join(workDir, "update.xrag.tar");
    await runCommand("tar", ["-cf", archive, "-C", payload, "."], {
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    });
    // Check the completed archive before publishing it. The final rename is on the same filesystem.
    const { stdout: checksum } = await runCommand(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import { createReadStream } from 'node:fs'; import { inspectArchive } from './packages/xrag/src/archive.ts'; console.log((await inspectArchive(createReadStream(process.argv[1]))).id);",
        archive,
      ],
      { cwd: sources, env, quiet: true },
    );
    const output = join(projectDir, "update.xrag.tar");
    await rename(archive, output);
    console.log(`Bundle finished: ${output}`);
    console.log(`SHA-256: ${checksum.trim()}`);
    return output;
  } finally {
    await Promise.all([
      rm(workDir, { recursive: true, force: true }),
      ...(sources ? [rm(sources, { recursive: true, force: true })] : []),
    ]);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  bundleUpdate().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
