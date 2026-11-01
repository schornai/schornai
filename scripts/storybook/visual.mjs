import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const playwrightVersion = JSON.parse(
  await readFile("node_modules/@playwright/test/package.json", "utf8"),
).version;
const image = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code, signal) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`${command} exited with ${code ?? signal}`)),
    );
  });
}
try {
  if (process.env.STORYBOOK_VISUAL_SKIP_BUILD !== "1")
    await run("npm", ["run", "storybook:build"]);
  const args = process.argv.slice(2);
  if (process.env.STORYBOOK_VISUAL_NATIVE === "1") {
    await run("node", [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config=tests/visual/playwright.config.mjs",
      ...args,
    ]);
  } else {
    for (const directory of [
      "tests/visual/__screenshots__",
      "test-results/storybook-visual",
      "playwright-report/storybook-visual",
    ])
      await mkdir(directory, { recursive: true });
    const dockerArgs = [
      "run",
      "--rm",
      "--init",
      "--ipc=host",
      "--platform=linux/arm64",
      "-w",
      "/work",
      "-v",
      `${root}:/work:ro`,
    ];
    for (const directory of [
      "tests/visual/__screenshots__",
      "test-results",
      "playwright-report",
    ])
      dockerArgs.push("-v", `${resolve(directory)}:/work/${directory}`);
    for (const variable of [
      "CI",
      "STORYBOOK_FILTER",
      "STORYBOOK_VISUAL_BOOK",
      "STORYBOOK_VISUAL_WORKERS",
      "STORYBOOK_VISUAL_PORT",
      "PLAYWRIGHT_BLOB_OUTPUT_DIR",
    ])
      if (process.env[variable])
        dockerArgs.push("-e", `${variable}=${process.env[variable]}`);
    dockerArgs.push(
      image,
      "node",
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config=tests/visual/playwright.config.mjs",
      ...args,
    );
    await run("docker", dockerArgs);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
