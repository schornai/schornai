import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { bundleUpdate } from "../packages/xrag/update/bundleUpdate.mts";
import {
  buildEnvironment,
  copyBuildSources,
  getBuildTarget,
} from "../packages/xrag/update/build/workspace.mts";
import {
  bundleImages,
  collectImages,
  getBundleImages,
} from "../packages/xrag/update/build/images.mts";
import { run } from "../packages/xrag/update/scripts/modules/run.mts";
import { inspectArchive } from "../packages/xrag/src/archive.ts";

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "xrag-build-test-"));
  temporary.push(dir);
  return dir;
}
async function put(root: string, file: string, contents = "fresh") {
  await mkdir(dirname(join(root, file)), { recursive: true });
  await writeFile(join(root, file), contents);
}
async function repository() {
  const root = await directory();
  await run("git", ["init", "--quiet", root], { quiet: true });
  await put(
    root,
    ".gitignore",
    "node_modules\n.env*\ndist\n.xrag-build\n*.xrag.tar\n",
  );
  return root;
}

it("snapshots current tracked and untracked sources, respecting local deletions and excluding stale artifacts and env files", async () => {
  const root = await repository();
  await put(root, "source.ts", "committed source");
  await put(root, "deleted.ts");
  await put(root, "tracked/dist/stale.js");
  await put(root, "tracked/.env.local", "secret");
  await run("git", ["add", "--force", "."], { cwd: root, quiet: true });
  await put(root, "source.ts", "local edit");
  await rm(join(root, "deleted.ts"));
  await put(root, "new file.ts", "new source");
  await put(root, "node_modules/broken.js");
  await put(root, "apps/transcriber-mac/venv/old.py");
  const snapshot = join(root, ".xrag-build/snapshot");
  await copyBuildSources(root, snapshot);
  expect(await readFile(join(snapshot, "source.ts"), "utf8")).toBe(
    "local edit",
  );
  expect(await readFile(join(snapshot, "new file.ts"), "utf8")).toBe(
    "new source",
  );
  for (const path of [
    "deleted.ts",
    "tracked",
    "node_modules",
    "apps/transcriber-mac/venv",
    ".xrag-build",
  ])
    expect(existsSync(join(snapshot, path))).toBe(false);
  expect(await readFile(join(root, "tracked/.env.local"), "utf8")).toBe(
    "secret",
  );
});

it("does not inherit npm workspace selection or Node dependency injection into clean builds", () => {
  expect(
    buildEnvironment({
      NODE_PATH: "/old/node_modules",
      NODE_OPTIONS: "--import /old.js",
      NODE_ENV: "production",
      npm_config_workspace: "apps/web",
      npm_config_ignore_scripts: "true",
      HTTPS_PROXY: "proxy",
    }),
  ).toEqual({ NODE_ENV: "development", CI: "1", HTTPS_PROXY: "proxy" });
});
it("keeps source symlinks inside the snapshot and rejects links to local artifacts", async () => {
  const root = await repository();
  await put(root, "source.ts", "source");
  await symlink(join(root, "source.ts"), join(root, "linked.ts"));
  const snapshot = await directory();
  await copyBuildSources(root, snapshot);
  expect(await readlink(join(snapshot, "linked.ts"))).toBe("source.ts");
  await put(root, "dist/old.ts");
  await symlink(join(root, "dist/old.ts"), join(root, "stale.ts"));
  await expect(copyBuildSources(root, await directory())).rejects.toThrow(
    "inside the checkout",
  );
});
it.each([
  ["darwin", "x64"],
  ["win32", "arm64"],
  ["linux", "ia32"],
])("rejects unsupported host %s/%s", (platform, arch) => {
  expect(() => getBuildTarget(platform, arch)).toThrow("not supported");
});
it("collects shared images once and includes migration but excludes disabled profiles", () => {
  const images = collectImages([
    {
      role: "core",
      profiles: [],
      config: { services: { proxy: { image: "aibox-proxy:latest" } } },
    },
    {
      role: "supabase",
      profiles: ["migration"],
      config: {
        services: {
          proxy: { image: "aibox-proxy:latest" },
          migrate: {
            image: "aibox-db-migrate:latest",
            profiles: ["migration"],
          },
          studio: { image: "unused/studio:1", profiles: ["disabled"] },
          db: { image: "registry.test:5000/postgres:42" },
        },
      },
    },
  ]);
  expect(images).toHaveLength(3);
  expect(
    images.find((image) => image.name === "aibox-proxy")?.services,
  ).toEqual(["core", "supabase"]);
  expect(images.find((image) => image.tag === "42")?.name).toBe(
    "registry.test:5000/postgres",
  );
});
it.each(["image", "image:${TAG}", "image@sha256:abcd", "aibox-new:latest"])(
  "rejects unresolved or unbuildable image %s",
  (image) => {
    expect(() =>
      collectImages([
        {
          role: "core",
          profiles: [],
          config: { services: { app: { image } } },
        },
      ]),
    ).toThrow();
  },
);

// Model only the image/profile fields returned by Compose; real CLI resolution is also
// exercised manually against the checked-in files without starting containers.
async function composeConfig(args: string[]) {
  const services: Record<string, { image: string; profiles?: string[] }> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== "-f") continue;
    const config = parse(await readFile(args[++i]!, "utf8"), {
      logLevel: "silent",
    });
    for (const [name, value] of Object.entries(config.services) as [
      string,
      { image?: string; profiles?: string[] },
    ][]) {
      services[name] = {
        ...services[name],
        ...value,
      } as (typeof services)[string];
    }
  }
  return JSON.stringify({ services });
}

it("derives exactly the deployed external versions from the repository Compose files", async () => {
  const fakeCompose: typeof run = async (_cmd, args) => {
    expect(args).toContain("--no-interpolate");
    expect(args).toContain("--no-env-resolution");
    return { stdout: await composeConfig(args), stderr: "" };
  };
  const root = resolve(import.meta.dirname, "..");
  const images = await getBundleImages(root, fakeCompose);
  const compose =
    (await readFile(
      join(root, "packages/xrag/update/container/supabase/overrides.yml"),
      "utf8",
    )) +
    (await readFile(
      join(
        root,
        "packages/xrag/update/container/document-extractor/docker-compose.yml",
      ),
      "utf8",
    ));
  const references = [
    ...new Set(
      [...compose.matchAll(/^\s+image:\s+(\S+)/gm)]
        .map((match) => match[1])
        .filter((image) => !image!.startsWith("aibox-")),
    ),
  ].sort();
  expect(
    images
      .filter((image) => !image.reference.startsWith("aibox-"))
      .map((image) => image.reference)
      .sort(),
  ).toEqual(references);
});

async function fixture() {
  const root = await repository();
  await put(root, "package-lock.json", '{"lockfileVersion":3}');
  await put(root, "source.ts", "current source");
  await put(root, "apps/transcriber-mac/requirements.txt", "package==1");
  await put(root, "packages/xrag/update/setup.sh", "#!/bin/sh");
  await put(root, "packages/xrag/update/update.mts", "// installer");
  await put(root, "packages/xrag/update/scripts/tool.mts");
  for (const file of [
    "docker-compose.yml",
    "supabase/docker-compose.yml",
    "supabase/overrides.yml",
    "document-extractor/docker-compose.yml",
  ]) {
    await put(
      root,
      `packages/xrag/update/container/${file}`,
      await readFile(
        resolve(import.meta.dirname, "../packages/xrag/update/container", file),
        "utf8",
      ),
    );
  }
  await put(root, "packages/xrag/update/container/volumes/example.txt");
  return root;
}
function builder(failure?: string) {
  return vi.fn<typeof run>(async (cmd, args, options) => {
    const cwd = String(options?.cwd ?? "");
    if (args.includes("--input-type=module")) {
      if (failure === "archive-validation")
        throw new Error("simulated failure");
      return {
        stdout: (await inspectArchive(createReadStream(args.at(-1)!))).id,
        stderr: "",
      };
    }
    if (cmd === "tar") return run(cmd, args, { ...options, quiet: true });
    if (cmd === "npm" && args[0] === "--version")
      return { stdout: "12.0.2\n", stderr: "" };
    if (cmd === "docker" && args[0] === "version")
      return {
        stdout: JSON.stringify({ Os: "linux", ApiVersion: "1.51" }),
        stderr: "",
      };
    if (args.includes("config"))
      return { stdout: await composeConfig(args), stderr: "" };
    if (cmd === "npm" && args[0] === "ci") {
      expect(existsSync(join(cwd, "node_modules"))).toBe(false);
      expect(existsSync(join(cwd, "external/downloads/dist"))).toBe(false);
    }
    if (args.includes(failure ?? "__never__"))
      throw new Error("simulated failure");
    if (args.includes("build:app:realtime"))
      await put(cwd, "apps/realtime/dist/rollup/appRealtime.js");
    if (args.includes("build:service"))
      for (const entry of ["cli.mjs", "commands.mjs", "installer.mjs"])
        await put(cwd, `packages/service/dist/${entry}`, "service");
    if (args.includes("external:downloads"))
      await put(cwd, "external/downloads/dist/node/node", "new node");
    if (args.includes("python:install"))
      await put(cwd, "apps/transcriber-mac/venv/ready");
    if (args.includes("build:app:transcriberMac")) {
      expect(existsSync(join(cwd, "apps/transcriber-mac/venv/ready"))).toBe(
        true,
      );
      await put(cwd, "apps/transcriber-mac/dist/rollup/appTranscriberMac.js");
      await put(
        cwd,
        "apps/transcriber-mac/dist/transcribe-worker/transcribe-worker",
      );
      await put(
        cwd,
        "apps/transcriber-mac/dist/transcribe-worker/_internal/runtime",
        "python runtime",
      );
    }
    if (args.includes("package"))
      await put(
        cwd,
        "out/schorn.ai Admin-darwin-arm64/schorn.ai Admin.app/Contents/MacOS/schorn.ai Admin",
      );
    if (cmd === "docker" && args[0] === "build") {
      expect(
        existsSync(join(cwd, "apps/realtime/dist/rollup/appRealtime.js")),
      ).toBe(true);
      for (const flag of ["--pull", "--no-cache", "--load", "--platform"])
        expect(args).toContain(flag);
    }
    if (cmd === "docker" && args.includes("inspect")) {
      const reference = args.at(-1)!;
      const platform = args[args.indexOf("--platform") + 1]!;
      return {
        stdout: JSON.stringify([
          {
            Os: "linux",
            Architecture: platform.split("/")[1],
            Id: `sha256:${"a".repeat(64)}`,
            RepoDigests: [
              `${reference.slice(0, reference.lastIndexOf(":"))}@sha256:${"b".repeat(64)}`,
            ],
          },
        ]),
        stderr: "",
      };
    }
    if (cmd === "docker" && args[0] === "save")
      await writeFile(
        args[args.indexOf("--output") + 1]!,
        "fresh image archive",
      );
    return { stdout: "", stderr: "" };
  });
}

it.each([
  ["linux", "x64"],
  ["linux", "arm64"],
  ["darwin", "arm64"],
])(
  "builds a complete %s/%s archive from clean or polluted checkouts",
  async (platform, arch) => {
    const root = await fixture();
    const fake = builder();
    const archive = await bundleUpdate({
      projectDir: root,
      platform,
      arch,
      runCommand: fake,
    });
    expect(
      (await inspectArchive(createReadStream(archive))).xrag.xrag_type,
    ).toBe("setup");
    const manifest = (
      await run("tar", ["-xOf", archive, "./installation.json"], {
        quiet: true,
      })
    ).stdout;
    expect(JSON.parse(manifest)).toMatchObject({ platform, arch });
    expect(JSON.parse(manifest).images).toHaveLength(12);
    expect(
      fake.mock.calls.some(([, args]) => args.includes("external:downloads")),
    ).toBe(platform === "darwin");
    await put(root, "external/downloads/dist/node/node", "stale node");
    await put(root, "packages/service/dist/obsolete.mjs", "old service");
    await put(root, "node_modules/broken.js");
    await put(root, "apps/transcriber-mac/venv/old.py");
    await bundleUpdate({
      projectDir: root,
      platform,
      arch,
      runCommand: builder(),
    });
    expect(
      (
        await run("tar", ["-xOf", archive, "./installation.json"], {
          quiet: true,
        })
      ).stdout,
    ).toBe(manifest);
    expect(
      await readFile(join(root, "external/downloads/dist/node/node"), "utf8"),
    ).toBe("stale node");
    expect(await readdir(join(root, ".xrag-build"))).toEqual([]);
  },
);

it.each([
  "ci",
  "external:downloads",
  "python:install",
  "build:app:realtime",
  "build:service",
  "build:app:transcriberMac",
  "package",
  "pull",
  "save",
  "archive-validation",
])(
  "preserves the last bundle and cleans temporary state when %s fails",
  async (failure) => {
    const root = await fixture();
    await put(root, "update.xrag.tar", "last complete bundle");
    await expect(
      bundleUpdate({
        projectDir: root,
        platform: "darwin",
        arch: "arm64",
        runCommand: builder(failure),
      }),
    ).rejects.toThrow("simulated failure");
    expect(await readFile(join(root, "update.xrag.tar"), "utf8")).toBe(
      "last complete bundle",
    );
    expect(await readdir(join(root, ".xrag-build"))).toEqual([]);
  },
);
it("rejects wrong-platform images before exporting them", async () => {
  const fake = vi.fn<typeof run>(async () => ({
    stdout: JSON.stringify([{ Os: "linux", Architecture: "amd64" }]),
    stderr: "",
  }));
  const images = collectImages([
    {
      role: "core",
      profiles: [],
      config: { services: { web: { image: "aibox-web:latest" } } },
    },
  ]);
  await expect(
    bundleImages("/source", "/output", "linux/arm64", images, fake),
  ).rejects.toThrow("Wrong image platform");
  expect(fake.mock.calls.some(([, args]) => args[0] === "save")).toBe(false);
});
it("collects process chunks without adding commas and propagates spawn failures", async () => {
  const { stdout } = await run(
    process.execPath,
    [
      "-e",
      "process.stdout.write('first'); setTimeout(() => process.stdout.write('second'), 20)",
    ],
    { quiet: true },
  );
  expect(stdout).toBe("firstsecond");
  const unicode = await run(
    process.execPath,
    [
      "-e",
      "const bytes = Buffer.from('ä'); process.stdout.write(bytes.subarray(0, 1)); setTimeout(() => process.stdout.write(bytes.subarray(1)), 20)",
    ],
    { quiet: true },
  );
  expect(unicode.stdout).toBe("ä");
  await expect(
    run("/missing/xrag-test-command", [], { quiet: true }),
  ).rejects.toThrow();
});
