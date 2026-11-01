import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { isDeepStrictEqual } from "node:util";
import {
  artifactTargets,
  catalogSchema,
  xragSchema,
  type Artifact,
} from "xrag/schema";
import { extractArchive } from "xrag/archive";
import { validateSiteUrl } from "xrag/validateSiteUrl";
import { latestSetupFor, setupMatches } from "xrag/setup";
import type { Context } from "./config.ts";
import { resolveFrom } from "./config.ts";
import { writeJson } from "./files.ts";
import type { Log } from "./log.ts";
import { run } from "./process.ts";

export function needsArtifact(artifact: Artifact, services: string[]) {
  if (
    artifact.xrag.xrag_type === "setup" &&
    !setupMatches(artifact, process.platform, process.arch)
  )
    return false;
  return artifactTargets(artifact.xrag).some(
    (target) => target === "service" || services.includes(target),
  );
}
async function install(
  artifact: Artifact,
  directory: string,
  context: Context,
  log: Log,
  signal: AbortSignal,
) {
  const { root, config } = context;
  const xrag = xragSchema.parse(artifact.xrag);
  switch (xrag.xrag_type) {
    case "setup":
      await run(
        {
          name: "setup",
          command: "bash",
          args: [join(directory, "setup.sh")],
          cwd: directory,
          env: {
            // Keep file-based settings out of the process environment: the
            // installer and replacement daemon must reread updated docker.env.
            ...process.env,
            SCHORNAI_HOME: root,
            SCHORNAI_CONFIG: context.configPath,
            SCHORNAI_SERVICE_UPDATE: "1",
          },
        },
        log,
        signal,
      );
      return true;
    case "mlxWhisperModel": {
      if (!artifact.fileSystemIdentifier)
        throw new Error("Missing shared model filesystem identifier");
      const models = join(root, "mlx/whisper/models");
      await mkdir(models, { recursive: true });
      const staging = await mkdtemp(join(models, ".install-"));
      const target = join(models, artifact.fileSystemIdentifier);
      try {
        await cp(join(directory, "config.json"), join(staging, "config.json"));
        await cp(join(directory, "weights.npz"), join(staging, "weights.npz"));
        await writeJson(join(staging, "model.json"), {
          identifier: xrag.meta.identifier,
        });
        await rm(target, { recursive: true, force: true });
        await rename(staging, target);
      } finally {
        await rm(staging, { recursive: true, force: true });
      }
      return true;
    }
    case "ollamaModel": {
      const models = join(root, "ollama/models");
      await mkdir(join(models, "blobs"), { recursive: true });
      await cp(join(directory, "blobs"), join(models, "blobs"), {
        recursive: true,
        verbatimSymlinks: true,
      });
      const manifests = join(
        models,
        "manifests/local_registry.schorn.ai/library",
        xrag.modelName,
      );
      await mkdir(manifests, { recursive: true });
      const temporary = join(manifests, `.${xrag.modelTag}.tmp`);
      await cp(join(directory, "manifest.json"), temporary);
      await rename(temporary, join(manifests, xrag.modelTag));
      return false;
    }
    case "certificate": {
      const target = join(root, "docker/volumes/api/cert");
      await mkdir(target, { recursive: true, mode: 0o700 });
      for (const file of ["privkey.pem", "fullkey.pem"])
        await writeFile(
          join(target, file),
          await readFile(join(directory, file)),
          { mode: 0o600 },
        );
      return true;
    }
    case "site_url": {
      const origin = validateSiteUrl(xrag.siteUrl);
      const envPath = resolveFrom(root, config.envFile);
      const source = await readFile(envPath, "utf8");
      let updated = source;
      for (const [key, value] of Object.entries({
        SITE_URL: origin,
        API_EXTERNAL_URL: `${origin}/auth/v1`,
      })) {
        const assignment = new RegExp(
          `^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=.*$`,
          "gm",
        );
        updated = assignment.test(updated)
          ? updated.replace(assignment, () => `${key}=${value}`)
          : `${updated}\n${key}=${value}\n`;
      }
      await writeFile(envPath, updated, { mode: 0o600 });
      return true;
    }
    case "files": {
      const target = join(root, "assets", xrag.name, artifact.id);
      await mkdir(target, { recursive: true });
      await cp(directory, target, { recursive: true, verbatimSymlinks: true });
      return false;
    }
  }
}

export async function syncArtifacts(
  context: Context,
  log: Log,
  signal: AbortSignal,
  hooks: {
    beforeInstall: () => Promise<void>;
    afterInstall: (restart: boolean) => Promise<void>;
  },
) {
  const sharing = context.config.sharing;
  if (!sharing) return;
  const token = context.environment[sharing.tokenEnv];
  if (!token || token.length < 32)
    throw new Error(
      "Sharing requires a SERVICE_API_TOKEN of at least 32 characters",
    );
  const headers = { Authorization: `Bearer ${token}` };
  const base = `${sharing.url.replace(/\/$/, "")}/api/service/artifacts`;
  const stateFile = join(context.root, "service-artifacts.json");
  let installed: Record<string, string> = {};
  try {
    installed = JSON.parse(await readFile(stateFile, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let offset: number | null = 0;
  const all: Artifact[] = [];
  while (offset !== null) {
    const response = await fetch(`${base}?offset=${offset}`, {
      headers,
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
    });
    if (!response.ok)
      throw new Error(`Catalog unavailable (HTTP ${response.status})`);
    const page = catalogSchema.parse(await response.json());
    all.push(...page.artifacts);
    if (page.nextOffset !== null && page.nextOffset <= offset)
      throw new Error("Invalid catalog pagination");
    offset = page.nextOffset;
  }
  all.sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const latestSetup = latestSetupFor(all, process.platform, process.arch);
  let failed = 0;
  for (const artifact of all) {
    if (
      artifact.deletedAt ||
      (context.config.development && artifact.xrag.xrag_type === "setup") ||
      installed[artifact.id] ||
      (artifact.xrag.xrag_type === "setup" &&
        artifact.id !== latestSetup?.id) ||
      !needsArtifact(artifact, context.config.services)
    )
      continue;
    signal.throwIfAborted();
    const cache = join(context.root, "cache");
    await mkdir(cache, { recursive: true, mode: 0o700 });
    const temporary = await mkdtemp(join(cache, "xrag-"));
    let paused = false;
    try {
      log("xrag", `Downloading ${artifact.name} (${artifact.xrag.xrag_type})`);
      const response = await fetch(`${base}/${artifact.id}`, {
        headers,
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(3_600_000)]),
      });
      if (!response.ok || !response.body)
        throw new Error(`Download failed (HTTP ${response.status})`);
      const archive = join(temporary, "archive.tar");
      await pipeline(
        response.body,
        createWriteStream(archive, { mode: 0o600 }),
        { signal },
      );
      const extracted = join(temporary, "payload");
      await mkdir(extracted, { mode: 0o700 });
      const inspected = await extractArchive(
        archive,
        extracted,
        artifact.id,
        signal,
      );
      if (!isDeepStrictEqual(inspected.xrag, xragSchema.parse(artifact.xrag)))
        throw new Error("Catalog metadata differs from archive");
      const disruptive = [
        "setup",
        "mlxWhisperModel",
        "certificate",
        "site_url",
      ].includes(artifact.xrag.xrag_type);
      if (disruptive) {
        await hooks.beforeInstall();
        paused = true;
      }
      const restart = await install(artifact, extracted, context, log, signal);
      installed[artifact.id] = new Date().toISOString();
      await writeJson(stateFile, installed);
      log("xrag", `Installed ${artifact.name}`);
      if (paused) {
        paused = false;
        await hooks.afterInstall(
          restart && artifact.xrag.xrag_type === "setup",
        );
      }
    } catch (error) {
      failed++;
      log(
        "xrag",
        `Installation failed for ${artifact.name}: ${String(error)}`,
        "stderr",
      );
      // Leave failed artifacts retryable; independent model packages can still install.
    } finally {
      await rm(temporary, { recursive: true, force: true });
      if (paused && !signal.aborted) await hooks.afterInstall(false);
    }
  }
  return { failed };
}
