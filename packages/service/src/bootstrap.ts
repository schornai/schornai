import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { z } from "zod";
import { extractArchive } from "xrag/archive";
import { defaultConfigPath, loadConfig } from "./config.ts";
import { runServiceCLI } from "./cli.ts";
import { hasLegacyLayout } from "./installer.ts";
import {
  fileExists,
  initialServices,
  prepareInitialSetup,
} from "./initialSetup.ts";
import { writeJson } from "./files.ts";
import { binary } from "./docker.ts";
import { run } from "./process.ts";
import { createLogger } from "./log.ts";
import { initialAdminCommand, setupInitialAdmin } from "./initialAdmin.ts";

export const latestSetupUrl = "https://schorn.ai/xrag/schornai/latest";
const pendingSchema = z.object({ version: z.literal(1), fresh: z.boolean() });

async function confirmInstallation(root: string) {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  readline.once("close", cancel);
  readline.once("SIGINT", cancel);
  try {
    const answer = await readline.question(
      `Install schorn.ai in ${root} and start its services? [y/N] `,
      { signal: controller.signal },
    );
    return answer.trim().toLowerCase() === "y";
  } catch (error) {
    if (controller.signal.aborted) return false;
    throw error;
  } finally {
    readline.close();
  }
}

async function downloadSetup(file: string, abort: AbortSignal) {
  let url = new URL(latestSetupUrl);
  const signal = AbortSignal.any([abort, AbortSignal.timeout(3_600_000)]);
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("Setup downloads require HTTPS without URL credentials");
    const response = await fetch(url.href, { redirect: "manual", signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Setup download redirect has no location");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(
        `Setup download failed (HTTP ${response.status}) at ${latestSetupUrl}; retry when the setup bundle is available`,
      );
    }
    const hash = createHash("sha256");
    await pipeline(
      response.body,
      new Transform({
        transform(chunk, _encoding, callback) {
          hash.update(chunk);
          callback(null, chunk);
        },
      }),
      createWriteStream(file, { flags: "wx", mode: 0o600 }),
      { signal },
    );
    return hash.digest("hex");
  }
  throw new Error("Too many setup download redirects");
}

async function acquireSetupLock(root: string) {
  const lock = join(root, ".setup-lock");
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    let pid: number;
    try {
      pid = z
        .object({ pid: z.number().int().positive() })
        .parse(
          JSON.parse(await readFile(join(lock, "owner.json"), "utf8")),
        ).pid;
    } catch {
      throw new Error(
        `Another setup is starting, or ${lock} needs manual recovery`,
      );
    }
    try {
      process.kill(pid, 0);
      throw new Error("Another schorn.ai setup is already running");
    } catch (probe) {
      if ((probe as NodeJS.ErrnoException).code !== "ESRCH") throw probe;
    }
    await rm(lock, { recursive: true });
    await mkdir(lock, { mode: 0o700 });
  }
  await writeJson(join(lock, "owner.json"), { pid: process.pid });
  return lock;
}

export async function runDefaultCLI() {
  const configPath = resolve(
    process.env.SCHORNAI_CONFIG ?? defaultConfigPath(),
  );
  const root = dirname(configPath);
  const pendingFile = join(root, ".setup-incomplete.json");
  const pending = (await fileExists(pendingFile))
    ? pendingSchema.parse(JSON.parse(await readFile(pendingFile, "utf8")))
    : undefined;
  const configured = await fileExists(configPath);
  const context = configured ? await loadConfig(configPath) : undefined;
  const runtime = join(root, "apps/service/cli.mjs");
  if (
    !pending &&
    (context?.config.development || (context && (await fileExists(runtime))))
  ) {
    console.log(`schorn.ai is already installed in ${root}`);
    await runServiceCLI(["service", "status", "--config", configPath]);
    if (context.config.services.includes("core"))
      console.log(initialAdminCommand(configPath));
    return;
  }
  if (!pending && (await hasLegacyLayout(root))) {
    console.log(
      `schorn.ai is already installed in ${root} (legacy Admin installation). Use the Admin app for its status.`,
    );
    return;
  }
  if (
    !configured &&
    !pending &&
    ((await fileExists(runtime)) ||
      (await fileExists(join(root, "docker.env"))) ||
      (await fileExists(join(root, "docker"))))
  )
    throw new Error(
      `Existing schorn.ai files in ${root} have no machine configuration. Restore config.json before continuing.`,
    );
  initialServices(process.platform, process.arch);
  if (!(await confirmInstallation(root))) {
    console.log("Installation cancelled.");
    return;
  }
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lock = await acquireSetupLock(root);
  const controller = new AbortController();
  const interrupted = () =>
    controller.abort(new Error("Setup interrupted; run npx schornai to retry"));
  process.on("SIGINT", interrupted);
  process.on("SIGTERM", interrupted);
  const { signal } = controller;
  let temporary: string | undefined;
  try {
    temporary = await mkdtemp(join(tmpdir(), "schornai-setup-"));
    console.log(`Downloading schorn.ai setup from ${latestSetupUrl}`);
    const archive = join(temporary, "setup.tar");
    const id = await downloadSetup(archive, signal);
    console.log(
      "Download complete. Verifying and extracting schorn.ai setup...",
    );
    const payload = join(temporary, "payload");
    await mkdir(payload, { mode: 0o700 });
    const inspected = await extractArchive(archive, payload, id, signal);
    if (inspected.xrag.xrag_type !== "setup")
      throw new Error(
        "The latest schorn.ai download is not an XRAG setup bundle",
      );
    const manifest = z
      .object({ version: z.literal(1), platform: z.string(), arch: z.string() })
      .parse(
        JSON.parse(await readFile(join(payload, "installation.json"), "utf8")),
      );
    if (
      manifest.platform !== process.platform ||
      manifest.arch !== process.arch ||
      (inspected.xrag.platform &&
        inspected.xrag.platform !== manifest.platform) ||
      (inspected.xrag.arch && inspected.xrag.arch !== manifest.arch)
    )
      throw new Error(
        `The setup bundle does not match this machine (${process.platform}/${process.arch})`,
      );
    const fresh = pending?.fresh ?? !configured;
    signal.throwIfAborted();
    await writeJson(pendingFile, { version: 1, fresh });
    if (fresh) await prepareInitialSetup(configPath, signal);
    const installation = await loadConfig(configPath);
    const log = createLogger(root, installation.environment, true);
    console.log(`Installing schorn.ai in ${root}`);
    await run(
      {
        name: "setup",
        command: "bash",
        args: [join(payload, "setup.sh")],
        cwd: payload,
        env: {
          ...process.env,
          SCHORNAI_HOME: root,
          SCHORNAI_CONFIG: configPath,
          SCHORNAI_NODE: process.execPath,
          SCHORNAI_SERVICE_UPDATE: "1",
        },
      },
      log,
      signal,
    );
    if (!(await fileExists(runtime)))
      throw new Error("Setup did not install the schorn.ai service runtime");
    await rm(pendingFile);
    console.log("schorn.ai installed successfully");
    await run(
      {
        name: "service",
        command: binary(root, "node", process.execPath),
        args: [runtime, "service", "start", "--config", configPath],
        env: process.env,
      },
      log,
      signal,
    );
    await runServiceCLI(["service", "status", "--config", configPath]);
    if (fresh) {
      console.log("Open https://localhost (local self-signed certificate).");
      await setupInitialAdmin(installation);
    }
  } finally {
    try {
      if (temporary) await rm(temporary, { recursive: true, force: true });
    } finally {
      try {
        await rm(lock, { recursive: true, force: true });
      } finally {
        process.removeListener("SIGINT", interrupted);
        process.removeListener("SIGTERM", interrupted);
      }
    }
  }
}
