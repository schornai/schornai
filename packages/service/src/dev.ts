import { parseArgs } from "node:util";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { configSchema, loadConfig, saveInitialConfig } from "./config.ts";
import { runDaemon } from "./daemon.ts";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

async function main() {
  const { values } = parseArgs({
    options: {
      config: { type: "string" },
      services: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(`Usage: npm run dev:service -- [--config PATH] [--services LIST]
Defaults to .service-dev/config.json; creates it only when missing.
--services selects initial roles (default: core, document-extractor, plus transcriber-mlx on Apple Silicon).
Edit config.json to change existing roles, then restart the command.
Uses the production service with workspace dev processes. Ctrl-C stops its services.`);
    return;
  }
  const path = resolve(
    values.config ?? join(workspace, ".service-dev/config.json"),
  );
  const initial = configSchema.parse({
    version: 1,
    id: randomUUID(),
    services:
      values.services !== undefined
        ? values.services
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [
            "core",
            "document-extractor",
            ...(process.platform === "darwin" && process.arch === "arm64"
              ? ["transcriber-mlx"]
              : []),
          ],
    development: { workspace },
    docker: { manageColima: false },
  });
  try {
    await saveInitialConfig(path, initial);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (values.services !== undefined) {
      const existing = await loadConfig(path);
      if (
        JSON.stringify(existing.config.services) !==
        JSON.stringify(initial.services)
      )
        throw new Error(
          `Configuration already exists. Edit services in ${path} instead of passing different --services.`,
        );
    }
  }
  const context = await loadConfig(path);
  if (context.config.development?.workspace !== workspace)
    throw new Error(`Expected a development config for this checkout: ${path}`);
  console.log(`Development service: ${path}`);
  await runDaemon(path);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Development service failed",
  );
  process.exitCode = 1;
});
