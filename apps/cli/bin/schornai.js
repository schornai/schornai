#!/usr/bin/env node

const args = process.argv.slice(2);
const help = `schorn.ai CLI

Usage: schornai
       schornai service <init|start|stop|restart|status|sync|logs|run> [options]
       schornai service --help

Without arguments, show the installed machine's status or ask to install schorn.ai.

News: https://schorn.ai/newsletter`;

try {
  if (!args.length) {
    const { runDefaultCLI } = await import("../dist/service/bootstrap.mjs");
    await runDefaultCLI();
  } else if (args[0] === "service") {
    const { runServiceCLI } = await import("../dist/service/commands.mjs");
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
} catch (error) {
  console.error(error instanceof Error ? error.message : "Command failed");
  process.exitCode = 1;
}
