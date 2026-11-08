import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

// An explicit URL allows generation against a disposable migration database.
// Never print it: it may contain credentials. Without it, keep the local target.
const args = [
  "--yes",
  "supabase@2.120.0",
  "gen",
  "types",
  "--lang=typescript",
  "--schema",
  "public",
];
const workdir = process.env.SUPABASE_TYPES_WORKDIR;
if (workdir) args.push("--workdir", workdir);
const databaseUrl = process.env.SUPABASE_TYPES_DB_URL;
args.push(...(databaseUrl ? ["--db-url", databaseUrl] : ["--local"]));
const result = spawnSync("npx", args, {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
if (
  result.error ||
  result.status !== 0 ||
  !result.stdout.includes("export type Database")
) {
  // Preserve both existing files when generation fails, including network errors.
  console.error(
    "Supabase type generation failed; existing type files were preserved.",
  );
  process.exitCode = 1;
} else {
  const paths = [
    "supabase/types.ts",
    "packages/database/src/_shared/_supabase.ts",
  ].map((path) => resolve(path));
  const temporary = paths.map((path) => `${path}.${process.pid}.tmp`);
  try {
    paths.forEach((path) => mkdirSync(dirname(path), { recursive: true }));
    writeFileSync(temporary[0], result.stdout);
    copyFileSync(temporary[0], temporary[1]);
    temporary.forEach((path, index) => renameSync(path, paths[index]));
    console.log("Regenerated both Supabase type files.");
  } finally {
    temporary.forEach((path) => rmSync(path, { force: true }));
  }
}
