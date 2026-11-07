import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it.each(["apps/admin-mac", "packages/desktop-app"])(
  "%s can select the default Electron launcher while retaining packaging fuses",
  (workspace) => {
    // Use Node's real dependency resolution: Vitest may deduplicate modules and
    // hide multiple PluginBase identities in the installed dependency tree.
    const result = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
          import assert from "node:assert/strict";
          import { resolve } from "node:path";
          const coreEntry = import.meta.resolve("@electron-forge/core");
          const { default: loadConfig } = await import(
            new URL("../util/forge-config.js", coreEntry)
          );
          const dir = resolve(process.argv[1]);
          const config = await loadConfig(dir);
          const fuses = config.pluginInterface.plugins.find(p => p.name === "fuses");
          assert.ok(fuses?.getHooks().packageAfterCopy, "Packaging must still flip fuses");
          assert.equal(await config.pluginInterface.overrideStartLogic({ dir }), false);
          console.log("launcher ready");
        `,
        workspace,
      ],
      { encoding: "utf8", timeout: 10_000 },
    );
    expect(result).toContain("launcher ready");
  },
);
