import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";
import boundaries from "./server-boundaries.json" with { type: "json" };

// Replace exact service modules before their server dependencies enter the bundle.
export function serverBoundaries(): Plugin {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const replacements = new Map(
    boundaries.map(([source, mock]) => [root + source, root + mock]),
  );
  return {
    name: "aibox-storybook-service-boundaries",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || importer.includes("/.storybook/server-mocks/")) return;
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      return resolved
        ? replacements.get(resolved.id.split("?")[0]!)
        : undefined;
    },
  };
}
