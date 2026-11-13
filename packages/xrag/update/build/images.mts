import { join } from "node:path";
import { run } from "../scripts/modules/run.mts";
import type { DockerImageIntegrity } from "../scripts/modules/integrity.ts";

const imageBuilds: Record<string, { dockerfile: string; context: string }> = {
  "aibox-web:latest": { dockerfile: "apps/web/Dockerfile", context: "." },
  "aibox-realtime:latest": {
    dockerfile: "apps/realtime/Dockerfile",
    context: ".",
  },
  "aibox-proxy:latest": {
    dockerfile: "apps/proxy/Dockerfile",
    context: "apps/proxy",
  },
  "aibox-db-migrate:latest": {
    dockerfile: "packages/xrag/update/database/migration/Dockerfile",
    context: ".",
  },
};

const composeGroups = [
  { role: "core", files: ["docker-compose.yml"], profiles: [] },
  {
    role: "supabase",
    files: ["supabase/docker-compose.yml", "supabase/overrides.yml"],
    profiles: ["migration"],
  },
  {
    role: "document-extractor",
    files: ["document-extractor/docker-compose.yml"],
    profiles: [],
  },
];

export type BundleImage = {
  reference: string;
  name: string;
  tag: string;
  file: string;
  services: string[];
};
type ComposeConfig = {
  services: Record<string, { image?: string; profiles?: string[] }>;
};

export function collectImages(
  configs: {
    role: string;
    profiles: readonly string[];
    config: ComposeConfig;
  }[],
): BundleImage[] {
  const images = new Map<string, BundleImage>();
  const filenames = new Map<string, string>();
  for (const { role, profiles, config } of configs) {
    for (const service of Object.values(config.services)) {
      if (
        service.profiles?.length &&
        !service.profiles.some((profile) => profiles.includes(profile))
      )
        continue;
      const reference = service.image;
      // The legacy integrity manifest requires an explicit name:tag.
      if (
        !reference ||
        reference.includes("$") ||
        reference.includes("@") ||
        reference.lastIndexOf(":") <= reference.lastIndexOf("/")
      ) {
        throw new Error(
          `Bundle images must have an explicit, literal tag: ${reference}`,
        );
      }
      if (reference.startsWith("aibox-") && !imageBuilds[reference])
        throw new Error(`Missing build definition for ${reference}`);
      const file = `${reference.replaceAll(/\W/gu, "_")}.tar`;
      if (filenames.has(file) && filenames.get(file) !== reference)
        throw new Error(`Conflicting image archive filename: ${file}`);
      filenames.set(file, reference);
      const image = images.get(reference) ?? {
        reference,
        name: reference.slice(0, reference.lastIndexOf(":")),
        tag: reference.slice(reference.lastIndexOf(":") + 1),
        file,
        services: [],
      };
      if (!image.services.includes(role)) image.services.push(role);
      images.set(reference, image);
    }
  }
  return [...images.values()].sort((a, b) =>
    a.reference.localeCompare(b.reference),
  );
}

export async function getBundleImages(projectDir: string, runCommand = run) {
  const configs = [];
  for (const group of composeGroups) {
    const { stdout } = await runCommand(
      "docker",
      [
        "compose",
        "--env-file",
        "/dev/null",
        ...group.files.flatMap((file) => [
          "-f",
          join(projectDir, "packages/xrag/update/container", file),
        ]),
        "config",
        "--no-interpolate",
        "--no-env-resolution",
        "--no-path-resolution",
        "--format",
        "json",
      ],
      {
        cwd: projectDir,
        quiet: true,
        env: {
          ...process.env,
          COMPOSE_PROFILES: "",
          COMPOSE_DISABLE_ENV_FILE: "1",
        },
      },
    );
    configs.push({ ...group, config: JSON.parse(stdout) as ComposeConfig });
  }
  return collectImages(configs);
}

export async function bundleImages(
  projectDir: string,
  imagesDir: string,
  dockerPlatform: string,
  images: BundleImage[],
  runCommand = run,
) {
  const integrity: DockerImageIntegrity[] = [];
  for (const image of images) {
    const build = imageBuilds[image.reference];
    if (build) {
      await runCommand(
        "docker",
        [
          "build",
          "--pull",
          "--no-cache",
          "--load",
          "--platform",
          dockerPlatform,
          "--tag",
          image.reference,
          "--file",
          join(projectDir, build.dockerfile),
          join(projectDir, build.context),
        ],
        { cwd: projectDir },
      );
    } else {
      await runCommand("docker", [
        "pull",
        "--platform",
        dockerPlatform,
        image.reference,
      ]);
    }
    const { stdout } = await runCommand(
      "docker",
      ["image", "inspect", "--platform", dockerPlatform, image.reference],
      { quiet: true },
    );
    const [info] = JSON.parse(stdout) as {
      Os: string;
      Architecture: string;
      Id: string;
      RepoDigests?: string[];
    }[];
    if (!info || `${info.Os}/${info.Architecture}` !== dockerPlatform)
      throw new Error(
        `Wrong image platform for ${image.reference}; expected ${dockerPlatform}`,
      );
    const digest = (
      build
        ? info.Id
        : (info.RepoDigests?.find((item) =>
            item.startsWith(`${image.name}@`),
          ) ?? info.RepoDigests?.[0])
    )?.match(/sha256:([a-f0-9]{64})$/)?.[1];
    if (!digest) throw new Error(`Missing image digest for ${image.reference}`);
    await runCommand("docker", [
      "save",
      "--platform",
      dockerPlatform,
      "--output",
      join(imagesDir, image.file),
      image.reference,
    ]);
    integrity.push({
      name: image.name,
      tag: image.tag,
      digest,
      type: "docker-image",
    });
  }
  return integrity;
}
