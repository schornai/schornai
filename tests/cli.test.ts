import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
const execute = promisify(execFile);
const cli = fileURLToPath(
  new URL("../apps/cli/bin/schornai.js", import.meta.url),
);
it("exposes service help from the existing schornai CLI", async () => {
  const result = await execute(process.execPath, [cli, "--help"]);
  expect(result.stdout).toContain("schornai service");
  expect(result.stdout).not.toContain("Coming soon");
  expect(
    (await execute(process.execPath, [cli, "--version"])).stdout.trim(),
  ).toBe("0.5.0");
});
it("fails unknown commands instead of silently accepting them", async () => {
  await expect(
    execute(process.execPath, [cli, "unknown-command"]),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining("Unknown command"),
  });
});
