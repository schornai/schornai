import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
// The default pre-commit command must enforce the same coverage gates as CI.
const extra = process.argv.slice(2).filter((arg) => arg !== "--coverage");
if (extra.length)
  throw new Error(
    "The full suite does not accept filters or overrides. Use npm run test:js for focused tests.",
  );
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}
const translationStatus = run(["scripts/check-translations.mjs"]);
const javascriptStatus = run([
  "node_modules/vitest/vitest.mjs",
  "run",
  "--coverage",
]);
const pythonStatus = run(["scripts/test-python.mjs", "--coverage"]);
const reportStatus =
  fs.existsSync(path.join(root, "coverage/coverage-summary.json")) &&
  fs.existsSync(path.join(root, "coverage/python/coverage.json"))
    ? run(["scripts/test-report.mjs"])
    : 0;
process.exit(
  translationStatus || javascriptStatus || pythonStatus || reportStatus,
);
