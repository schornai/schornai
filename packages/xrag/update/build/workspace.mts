import { cp, lstat, mkdir, realpath, symlink } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import { run } from "../scripts/modules/run.mts";

// These must never become build inputs, even if accidentally tracked by Git.
const generated = new Set([
  "node_modules",
  "dist",
  "out",
  "venv",
  ".venv",
  ".next",
  ".vite",
  ".tmp",
  ".xrag-build",
  ".rollup.cache",
  ".turbo",
  "__pycache__",
]);

export async function copyBuildSources(
  projectDir: string,
  destination: string,
) {
  const root = await realpath(projectDir);
  const { stdout } = await run(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: projectDir, quiet: true },
  );
  await mkdir(destination, { recursive: true });
  for (const file of [...new Set(stdout.split("\0").filter(Boolean))].sort()) {
    if (
      file
        .split("/")
        .some((part) => generated.has(part) || part.startsWith(".env")) ||
      file.endsWith(".xrag.tar") ||
      file.endsWith(".tsbuildinfo")
    )
      continue;
    const source = join(projectDir, file);
    const stats = await lstat(source).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return undefined; // A locally deleted tracked file.
      throw error;
    });
    if (!stats) continue;
    if (stats.isDirectory())
      throw new Error(`Submodules are not supported as bundle inputs: ${file}`);
    await mkdir(dirname(join(destination, file)), { recursive: true });
    if (stats.isSymbolicLink()) {
      const target = relative(root, await realpath(source));
      if (
        isAbsolute(target) ||
        target
          .split("/")
          .some(
            (part) =>
              part === ".." || generated.has(part) || part.startsWith(".env"),
          )
      ) {
        throw new Error(
          `Bundle source symlink must point to source files inside the checkout: ${file}`,
        );
      }
      await symlink(
        relative(dirname(join(root, file)), join(root, target)),
        join(destination, file),
      );
      continue;
    }
    await cp(source, join(destination, file), { verbatimSymlinks: true });
  }
}

export function getBuildTarget(platform: string, arch: string) {
  if (
    !(platform === "darwin" && arch === "arm64") &&
    !(platform === "linux" && ["arm64", "x64"].includes(arch))
  ) {
    throw new Error(
      "Setup bundles require an Apple-Silicon Mac or Linux on ARM64/x64; cross-platform native builds are not supported.",
    );
  }
  return {
    includesMacRuntime: platform === "darwin",
    dockerPlatform: `linux/${arch === "arm64" ? "arm64" : "amd64"}`,
  };
}

export function buildEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const env: NodeJS.ProcessEnv = {
    ...source,
    NODE_ENV: "development",
    CI: "1",
  };
  // npm and Node must resolve tools/dependencies inside the new workspace.
  for (const key of Object.keys(env)) {
    if (
      ["NODE_PATH", "NODE_OPTIONS", "INIT_CWD"].includes(key) ||
      /^npm_(?:config_(?:workspace|workspaces|prefix|local_prefix|global|omit|production|ignore_scripts)|lifecycle_|package_)/i.test(
        key,
      )
    )
      delete env[key];
  }
  return env;
}
