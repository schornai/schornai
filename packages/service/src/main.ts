import { runServiceCLI } from "./cli.ts";

runServiceCLI().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Service command failed",
  );
  process.exitCode = 1;
});
