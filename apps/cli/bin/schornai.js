#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
const help = `schorn.ai CLI

Usage: schornai
       schornai service <init|start|stop|restart|status|sync|logs|run|setup-admin> [options]
       schornai service --help

Without arguments, show the installed machine's status or ask to install schorn.ai.

News: https://schorn.ai/newsletter`;

export async function runCLI(
  args,
  loadService = (file) =>
    import(new URL(`../dist/service/${file}`, import.meta.url).href),
) {
  if (!args.length) {
    const { runDefaultCLI } = await loadService("bootstrap.mjs");
    await runDefaultCLI();
  } else if (args[0] === "service") {
    const { runServiceCLI } = await loadService("commands.mjs");
    await runServiceCLI(args);
  } else if (args[0] === "--help" || args[0] === "-h") {
    console.log(help);
  } else if (args[0] === "--version") {
    const { readFile } = await import("node:fs/promises");
    console.log(
      JSON.parse(
        await readFile(new URL("../package.json", import.meta.url), "utf8"),
      ).version,
    );
  } else {
    throw new Error(`Unknown command: ${args[0]}\n${help}`);
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await runCLI(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Command failed");
    process.exitCode = 1;
  }
}
