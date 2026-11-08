import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Supabase truncates long project IDs; stay below that limit so ownership and
// cleanup use the same exact identifier.
const projectId = `schornai-sql-${randomBytes(12).toString("hex")}`;
const container = `supabase_db_${projectId}`;
const env = {
  ...process.env,
  CUSTOM_ACCESS_TOKEN_URI:
    "http://host.docker.internal:3003/api/auth/access-token",
  CUSTOM_ACCESS_TOKEN_SECRETS: `v1,whsec_${randomBytes(32).toString("base64")}`,
};
// This runner creates its own local database; it never links a hosted project
// or reads the application's private environment files.
for (const key of [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_PROJECT_ID",
])
  delete env[key];
let child;
let interrupted = false;
function stop() {
  interrupted = true;
  child?.kill("SIGTERM");
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
function run(command, args, input, capture = false) {
  return new Promise((resolveCommand, reject) => {
    const process = spawn(command, args, {
      cwd: root,
      env,
      stdio: [
        input === undefined ? "ignore" : "pipe",
        capture ? "pipe" : "inherit",
        "inherit",
      ],
    });
    let output = "";
    process.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    child = process;
    process.once("error", reject);
    process.once("close", (code, signal) => {
      if (child === process) child = undefined;
      if (code === 0) resolveCommand(output);
      else reject(new Error(`${command} failed (${signal ?? code})`));
    });
    if (input !== undefined) {
      process.stdin.on("error", () => {});
      process.stdin.end(input);
    }
  });
}
async function freePort() {
  const server = createServer();
  await new Promise((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePort);
  });
  const port = server.address().port;
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  return port;
}
await mkdir(join(root, ".service-dev"), { recursive: true });
const workdir = await mkdtemp(join(root, ".service-dev/sql-test-"));
const cli = (...args) =>
  run("npx", ["--yes", "supabase@2.120.0", "--workdir", workdir, ...args]);
try {
  const directory = join(workdir, "supabase");
  await mkdir(directory);
  await cp(join(root, "supabase/migrations"), join(directory, "migrations"), {
    recursive: true,
  });
  await cp(join(root, "supabase/seed.sql"), join(directory, "seed.sql"));
  const port = await freePort();
  let section = "";
  const config = (await readFile(join(root, "supabase/config.toml"), "utf8"))
    .split("\n")
    .map((line) => {
      const heading = /^\[([^\]]+)\]/.exec(line);
      if (heading) section = heading[1];
      if (/^project_id\s*=/.test(line)) return `project_id = "${projectId}"`;
      if (section === "db" && /^port\s*=/.test(line)) return `port = ${port}`;
      return line;
    })
    .join("\n");
  await writeFile(join(directory, "config.toml"), config);
  if (interrupted) throw new Error("SQL tests interrupted");
  console.log(`Starting disposable SQL test database (${projectId}).`);
  await cli("db", "start");
  const files = (await readdir(join(root, "supabase/tests")))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  if (!files.length) throw new Error("No SQL regression files found");
  for (const file of files) {
    if (interrupted) throw new Error("SQL tests interrupted");
    console.log(`SQL regression: ${file}`);
    await run(
      "docker",
      [
        "exec",
        "--interactive",
        container,
        "psql",
        "--no-psqlrc",
        "--set",
        "ON_ERROR_STOP=1",
        "--username",
        "postgres",
        "--dbname",
        "postgres",
      ],
      await readFile(join(root, "supabase/tests", file)),
    );
  }
  console.log(`Passed all ${files.length} SQL regression files.`);
  if (process.argv.includes("--generate-types")) {
    env.SUPABASE_TYPES_WORKDIR = workdir;
    await run("npm", ["run", "supabase:types"]);
    delete env.SUPABASE_TYPES_WORKDIR;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "SQL tests failed");
  process.exitCode = 1;
} finally {
  try {
    await cli("stop", "--project-id", projectId, "--no-backup");
    for (const args of [
      ["ps", "-aq"],
      ["volume", "ls", "-q"],
    ]) {
      const remaining = await run(
        "docker",
        [...args, "--filter", `label=com.supabase.cli.project=${projectId}`],
        undefined,
        true,
      );
      if (remaining.trim())
        throw new Error("SQL test resources were not removed");
    }
    await rm(workdir, { recursive: true, force: true });
  } catch {
    console.error(
      `Cleanup failed for disposable project ${projectId}; its configuration remains at ${workdir}.`,
    );
    process.exitCode = 1;
  }
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
}
