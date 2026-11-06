import { readFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const endpoint = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.hash &&
    !url.search
  );
});
export const configSchema = z.strictObject({
  version: z.literal(1),
  id: z.uuid(),
  services: z
    .array(
      z.enum([
        "supabase",
        "core",
        "ollama",
        "transcriber-mlx",
        "document-extractor",
      ]),
    )
    .refine((items) => new Set(items).size === items.length),
  envFile: z.string().min(1).default("docker.env"),
  docker: z
    .strictObject({
      manageColima: z.boolean().default(false),
      memory: z.number().int().min(2).max(128).default(8),
    })
    .default({ manageColima: false, memory: 8 }),
  sharing: z
    .strictObject({
      url: endpoint.refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" ||
          ["127.0.0.1", "[::1]"].includes(url.hostname)
        );
      }, "Sharing requires HTTPS except on loopback addresses 127.0.0.1 and [::1]"),
      tokenEnv: z
        .string()
        .regex(/^[A-Z][A-Z0-9_]*$/)
        .default("SERVICE_API_TOKEN"),
    })
    .optional(),
  endpoints: z
    .strictObject({
      supabase: endpoint.optional(),
      realtime: endpoint.optional(),
      ollama: endpoint.optional(),
      documentExtractor: endpoint.optional(),
    })
    .default({}),
  caFile: z.string().min(1).optional(),
  development: z
    .strictObject({
      workspace: z
        .string()
        .refine(isAbsolute, "Development workspace must be an absolute path"),
    })
    .optional(),
});
export type ServiceConfig = z.infer<typeof configSchema>;
export type Context = Awaited<ReturnType<typeof loadConfig>>;
export const defaultConfigPath = () =>
  join(process.env.SCHORNAI_HOME ?? join(homedir(), ".aibox"), "config.json");
export const resolveFrom = (root: string, path: string) =>
  isAbsolute(path) ? path : resolve(root, path);

export async function loadConfig(path: string, initialConfig?: ServiceConfig) {
  const configPath = resolve(path);
  const root = dirname(configPath);
  let config: ServiceConfig;
  try {
    config = configSchema.parse(JSON.parse(await readFile(configPath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !initialConfig)
      throw error;
    config = initialConfig;
  }
  // Node's parser handles quoted values and comments without a second dotenv dependency.
  const { parseEnv } = await import("node:util");
  let environment: NodeJS.ProcessEnv = {};
  try {
    environment = parseEnv(
      await readFile(resolveFrom(root, config.envFile), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const developmentEnvironments: Record<string, NodeJS.ProcessEnv> = {};
  if (config.development) {
    for (const app of ["web", "realtime", "transcriber-mac", "supabase"]) {
      const values: NodeJS.ProcessEnv = {};
      for (const file of app === "web"
        ? [".env", ".env.development", ".env.local", ".env.development.local"]
        : [".env", ".env.local"]) {
        try {
          Object.assign(
            values,
            parseEnv(
              await readFile(
                app === "supabase"
                  ? join(config.development.workspace, app, file)
                  : join(config.development.workspace, "apps", app, file),
                "utf8",
              ),
            ),
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      developmentEnvironments[app] = values;
    }
  }
  return {
    config,
    configPath,
    root,
    environment: { ...environment, ...process.env },
    ...(config.development ? { developmentEnvironments } : {}),
  };
}

export async function initConfig(path: string, services: string[]) {
  const config = configSchema.parse({
    version: 1,
    id: randomUUID(),
    services,
    docker: { manageColima: process.platform === "darwin" },
  });
  await saveInitialConfig(path, config);
  return config;
}

export async function saveInitialConfig(path: string, config: ServiceConfig) {
  await mkdir(dirname(resolve(path)), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
}
