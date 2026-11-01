import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

export const root = path.resolve(import.meta.dirname, "..");
export const cli = ["--yes", "supabase@2.120.0"];
export function localUrl(value, expectedPort) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    url.port !== String(expectedPort)
  ) {
    throw new Error(
      "Abbruch: Supabase-Ziel ist nicht die erwartete lokale Instanz.",
    );
  }
  return url.origin;
}
export async function confirmReset({ project, interactive, ask, reset, log }) {
  if (!interactive)
    throw new Error(
      "Reset benötigt ein interaktives Terminal. Vorschau: npm run seed:reset -- --preview",
    );
  const phrase = `RESET ${project}`;
  const answer = await ask(
    `Zum endgültigen Löschen bitte exakt „${phrase}“ eingeben: `,
  );
  if (answer !== phrase) {
    log("Abgebrochen. Keine Daten geändert.");
    return false;
  }
  await reset();
  return true;
}
function envFile(file) {
  const filename = path.join(root, file);
  return fs.existsSync(filename)
    ? parseEnv(fs.readFileSync(filename, "utf8"))
    : {};
}
export async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--preview"))
    throw new Error(
      "Erlaubt ist nur --preview; Remote-Ziele und automatische Bestätigung sind ausgeschlossen.",
    );
  const env = {
    ...envFile("supabase/.env"),
    ...envFile("supabase/.env.local"),
    ...process.env,
  };
  const run = (command, argv, options = {}) =>
    execFileSync(command, argv, {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });
  const context = JSON.parse(run("docker", ["context", "inspect"]))[0];
  const endpoint =
    env.DOCKER_HOST && !env.DOCKER_CONTEXT
      ? env.DOCKER_HOST
      : context.Endpoints.docker.Host;
  if (!endpoint.startsWith("unix://") && !endpoint.startsWith("npipe://"))
    throw new Error("Abbruch: Nur ein lokaler Docker-Daemon ist erlaubt.");
  // Keep the reviewed target even if another terminal switches Docker contexts.
  if (!env.DOCKER_HOST || env.DOCKER_CONTEXT) env.DOCKER_CONTEXT = context.Name;
  const config = fs.readFileSync(
    path.join(root, "supabase/config.toml"),
    "utf8",
  );
  const project = config.match(/^project_id\s*=\s*"([\w-]+)"/m)?.[1];
  if (!project) throw new Error("Ungültige lokale project_id.");
  const status = parseEnv(run("npx", [...cli, "status", "-o", "env"]));
  const api = new URL(status.API_URL);
  const target = localUrl(status.API_URL, api.port);
  console.log(
    `\nLokales Supabase-Projekt: ${project}\nDocker-Kontext: ${context.Name}\nAPI: ${target}`,
  );
  for (const app of ["web", "realtime", "transcriber-mac"]) {
    const appEnv = {
      ...envFile(`apps/${app}/.env`),
      ...envFile(`apps/${app}/.env.local`),
      ...process.env,
    };
    const url = appEnv.SUPABASE_URL;
    if (url) localUrl(url, api.port);
    console.log(
      `${app}: ${url ? localUrl(url, api.port) : "SUPABASE_URL nicht konfiguriert"}`,
    );
  }
  const container = `supabase_db_${project}`;
  const sql = fs.readFileSync(
    path.join(root, "scripts/seed-summary.sql"),
    "utf8",
  );
  console.log(
    run(
      "docker",
      [
        "exec",
        "-i",
        container,
        "psql",
        "-X",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-P",
        "pager=off",
      ],
      { input: sql },
    ),
  );
  console.log(
    "Neue Beispieldaten: Admin demo@aibox.test, Workspace „Lokale Entwicklung“, Qwen3, Nomic Embed, Whisper Tiny, Testagent, Dokumentenablage und Transkriptor.",
  );
  console.log(
    "Alle Daten der lokalen Datenbank einschließlich Benutzer, Einstellungen, Chats und Datei-Metadaten werden gelöscht. Migrationen und Seed werden neu eingespielt. Kein Backup wird erstellt.",
  );
  console.log(
    "Storage-Dateien können physisch als verwaiste Dateien zurückbleiben. Modelle auf dem Host und .env-Dateien werden nicht gelöscht. Stoppe laufende App-/Worker-Prozesse vorher.",
  );
  if (args.includes("--preview")) return;
  let readline;
  try {
    const completed = await confirmReset({
      project,
      interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
      ask: (question) => {
        readline = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        return readline.question(question);
      },
      log: console.log,
      reset: () =>
        run(
          "npx",
          [
            ...cli,
            "db",
            "reset",
            "--local",
            "--sql-paths",
            "./seed.sql",
            "--yes",
          ],
          { stdio: "inherit" },
        ),
    });
    if (completed) {
      console.log(
        run(
          "docker",
          [
            "exec",
            "-i",
            container,
            "psql",
            "-X",
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-P",
            "pager=off",
          ],
          { input: sql },
        ),
      );
      console.log(
        "Fertig. Login: demo@aibox.test / Aibox-local-demo-2026!\nDanach npm run dev:web starten und neu anmelden.\nKI-Funktionen benötigen laufende Ollama-/Transcriber-Dienste und die passenden Modelle.\nAlte IDs und Zugangsdaten aus .local-setup gelten nicht mehr.",
      );
    }
  } finally {
    readline?.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    // Child-process errors can contain status output with API credentials.
    console.error(
      error.status !== undefined
        ? "Befehl fehlgeschlagen. Docker/Supabase prüfen; nach einem Reset-Fehler kann die Datenbank unvollständig sein."
        : error.message,
    );
    process.exitCode = 1;
  });
}
