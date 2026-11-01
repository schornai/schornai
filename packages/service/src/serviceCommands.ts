import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Context } from "./config.ts";
import { resolveFrom } from "./config.ts";
import type { Command } from "./process.ts";
import { binary } from "./docker.ts";
import { connectionEnvironment, workerRealtimeUrl } from "./environment.ts";
import { prepareTranscriberEnvironment } from "@schornio/aibox-package-utils/prepareTranscriberEnvironment";

// Resolves launch commands without starting processes. The environments contain
// credentials and are for execution only; never expose or log the command plan.
export function serviceCommands(context: Context) {
  const { root, config, environment } = context;
  const workspace = config.development?.workspace;
  const env = {
    ...environment,
    HOME: homedir(),
    SCHORNAI_HOME: root,
    SERVICE_ID: config.id,
    PATH: `${join(root, "bin/ffmpeg")}:${join(root, "bin/docker")}:${join(root, "bin/lima/bin")}:${environment.PATH ?? "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin"}`,
  };
  const appEnvironment = (app: string): NodeJS.ProcessEnv => ({
    ...context.developmentEnvironments?.[app],
    ...env,
  });
  const developmentCommand = (
    app: string,
    name: string,
    appEnv: NodeJS.ProcessEnv,
  ): Command => ({
    name,
    command: "npm",
    args: ["run", "dev", "--workspace", `apps/${app}`],
    cwd: workspace,
    env: { ...appEnv, NODE_ENV: "development" },
  });
  const native: Command[] = [];
  if (config.services.includes("ollama"))
    native.push({
      name: "ollama",
      command: binary(root, "ollama"),
      args: ["serve"],
      env: {
        ...env,
        OLLAMA_FLASH_ATTENTION: "1",
        OLLAMA_MODELS: join(root, "ollama/models"),
      },
    });
  if (config.services.includes("transcriber-mlx")) {
    if (process.platform !== "darwin" || process.arch !== "arm64")
      throw new Error(
        "The transcriber-mlx service requires macOS on Apple Silicon",
      );
    const workerEnv = appEnvironment("transcriber-mac");
    Object.assign(workerEnv, connectionEnvironment(context, workerEnv, "host"));
    const supabase = workerEnv.SUPABASE_URL;
    const localRealtime =
      !config.endpoints.realtime &&
      !workerEnv.REALTIME_SERVER_URL &&
      config.services.includes("core");
    const realtime = workerRealtimeUrl(context, workerEnv);
    const localCertificate = join(root, "docker/volumes/api/cert/fullkey.pem");
    const caFile = config.caFile
      ? resolveFrom(root, config.caFile)
      : (workerEnv.NODE_EXTRA_CA_CERTS ??
        (localRealtime && existsSync(localCertificate)
          ? localCertificate
          : undefined));
    const transcriberEnvironment = prepareTranscriberEnvironment({
      ...workerEnv,
      WORKER_IDENTIFIER: `${config.id}:transcriber-mlx`,
      SUPABASE_URL: supabase,
      REALTIME_SERVER_URL: realtime,
      ...(caFile ? { NODE_EXTRA_CA_CERTS: caFile } : {}),
    });
    native.push(
      workspace
        ? developmentCommand(
            "transcriber-mac",
            "transcriber-mlx",
            transcriberEnvironment,
          )
        : {
            name: "transcriber-mlx",
            command: binary(root, "node", process.execPath),
            args: ["appTranscriberMac.js"],
            cwd: join(root, "apps/transcriber-mac"),
            env: transcriberEnvironment,
          },
    );
  }
  const compose: { spec: Command; services: string[] }[] = [];
  // Keep Supabase's project name and volume paths to retain existing database data.
  const standaloneCompose = join(root, "bin/docker/docker-compose");
  const composeSpec = (name: string, files: string[]): Command => ({
    name,
    command: existsSync(standaloneCompose)
      ? standaloneCompose
      : binary(root, "docker"),
    args: [
      ...(existsSync(standaloneCompose) ? [] : ["compose"]),
      "--project-directory",
      join(root, "docker"),
      "--env-file",
      resolveFrom(root, config.envFile),
      ...files.flatMap((file) => ["-f", join(root, "docker", file)]),
    ],
    env: {
      ...env,
      ...connectionEnvironment(context, env, "container"),
    },
  });
  // Development uses the repository's standard Supabase CLI configuration.
  // Production retains its existing PostgreSQL data and pinned Compose stack.
  const localSupabase: Command | undefined =
    workspace && config.services.includes("supabase")
      ? {
          name: "supabase",
          command: "npx",
          args: ["--yes", "supabase@2.120.0"],
          cwd: workspace,
          env: appEnvironment("supabase"),
        }
      : undefined;
  if (config.services.includes("supabase") && !workspace)
    compose.push({
      spec: composeSpec("supabase", [
        "supabase/docker-compose.yml",
        "supabase/overrides.yml",
      ]),
      services: [
        "api-gw",
        "auth",
        "auth-hook",
        "rest",
        "storage",
        "imgproxy",
        "supavisor",
      ],
    });
  if (config.services.includes("document-extractor"))
    compose.push({
      spec: workspace
        ? {
            name: "document-extractor",
            command: binary(root, "docker"),
            args: [
              "compose",
              "--project-name",
              `schornai-extractor-dev-${config.id}`,
              "--file",
              join(
                workspace,
                "packages/xrag/update/container/document-extractor/docker-compose.yml",
              ),
            ],
            env,
          }
        : composeSpec("document-extractor", [
            "document-extractor/docker-compose.yml",
          ]),
      services: ["document-extractor"],
    });
  if (config.services.includes("core") && workspace) {
    for (const app of ["web", "realtime"]) {
      const appEnv: NodeJS.ProcessEnv = appEnvironment(app);
      const aliases: Record<string, string | undefined> = {
        ...connectionEnvironment(context, appEnv, "host"),
        REALTIME_SERVER_URL: "http://127.0.0.1:9000",
      };
      for (const [key, value] of Object.entries(aliases))
        if (value !== undefined) appEnv[key] = value;
      if (app === "realtime")
        appEnv.OLLAMA_MODELS = join(root, "ollama/models");
      native.push(developmentCommand(app, app, appEnv));
    }
    const proxyEnvironment = { ...env } as NodeJS.ProcessEnv;
    const supabaseUrl = connectionEnvironment(
      context,
      appEnvironment("web"),
      "host",
    ).SUPABASE_URL;
    if (supabaseUrl && !proxyEnvironment.AIBOX_SUPABASE_PROXY_URL) {
      const url = new URL(supabaseUrl);
      if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
        url.hostname = environment.AIBOX_DOCKER_HOST ?? "host.docker.internal";
      proxyEnvironment.AIBOX_SUPABASE_PROXY_URL = url.origin;
    }
    compose.push({
      spec: {
        name: "core",
        command: binary(root, "docker"),
        args: [
          "compose",
          "--project-name",
          `schornai-dev-${config.id}`,
          "--project-directory",
          join(workspace, "apps/proxy"),
          "--file",
          join(workspace, "apps/proxy/docker-compose.dev.yml"),
        ],
        env: proxyEnvironment,
      },
      services: ["web-app-dev"],
    });
  } else if (config.services.includes("core"))
    compose.push({
      spec: composeSpec("core", ["docker-compose.yml"]),
      services: ["web", "realtimeyjs", "proxy"],
    });
  return { env, native, compose, localSupabase };
}
