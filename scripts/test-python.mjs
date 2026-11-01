import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const venv = path.join(
  root,
  ".test-venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const python =
  process.env.AIBOX_TEST_PYTHON ??
  (fs.existsSync(venv)
    ? venv
    : process.platform === "win32"
      ? "python"
      : "python3");
const coverage = process.argv.includes("--coverage");
const unittest = [
  "-m",
  "unittest",
  "discover",
  "-s",
  "tests",
  "-p",
  "*_test.py",
];
function run(args) {
  const result = spawnSync(python, args, { cwd: root, stdio: "inherit" });
  if (result.error)
    console.error(`Cannot run Python tests: ${result.error.message}`);
  return result.status ?? 1;
}
if (!coverage) process.exit(run(unittest));
fs.mkdirSync(path.join(root, "coverage/python"), { recursive: true });
let status = run([
  "-m",
  "coverage",
  "run",
  "--branch",
  "--source=apps/transcriber-mac/src/core",
  ...unittest,
]);
status ||= run(["-m", "coverage", "report", "--fail-under=90"]);
// Preserve diagnostics even when the threshold fails.
const htmlStatus = run(["-m", "coverage", "html", "-d", "coverage/python"]);
const jsonStatus = run([
  "-m",
  "coverage",
  "json",
  "-o",
  "coverage/python/coverage.json",
]);
process.exit(status || htmlStatus || jsonStatus);
