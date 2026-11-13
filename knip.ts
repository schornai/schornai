import type { KnipConfig } from "knip";
import boundaries from "./apps/web/.storybook/server-boundaries.json" with { type: "json" };

const config: KnipConfig = {
  // Bundled agent examples are not application source; database types are generated.
  ignore: [".agents/**", "supabase/types.ts"],
  eslint: { config: ["eslint.config.{ts,mts,mjs}"] },
  prettier: true,
  workspaces: {
    ".": {
      // Invoked directly by the repository formatting workflow in AGENTS.md.
      ignoreDependencies: ["prettier"],
      entry: [
        "scripts/storybook/serve-static.mjs",
        "scripts/test-report.mjs",
        "tests/visual/playwright.config.mjs",
      ],
    },
    "apps/realtime": {
      // AI SDK dynamic loading; the Dockerfile verifies it in the runtime image.
      ignoreDependencies: ["undici"],
    },
    "apps/web": {
      // next.config.ts traces this dynamic AI SDK dependency into the standalone image.
      ignoreDependencies: ["undici"],
      // Vite resolves these replacements from the same manifest at runtime.
      entry: boundaries.map(([, mock]) => mock.replace("apps/web/", "")),
    },
    "apps/cli": {
      // The build copies the service output rather than importing its source.
      ignoreDependencies: ["@schornio/aibox-package-service"],
    },
    "apps/transcriber-mac": { ignoreBinaries: ["python3.13"] },
    "packages/xrag": {
      // Standalone tools and the generated installer are invoked outside the import graph.
      entry: [
        "update/update.mts",
        "ollamaModel/createXRAG.ts",
        "update/scripts/echoDockerEnv.ts",
        "update/scripts/generateSetupFromReadme.ts",
      ],
      ignoreUnresolved: ["./apps/service/installer.mjs"],
    },
    "packages/ui": {
      // React.lazy uses default; package consumers may use the named export.
      ignoreIssues: { "src/components/math.tsx": ["duplicates"] },
    },
    "packages/desktop-app": {
      // Keep the original shadcn primitives' public composition API intact.
      ignoreIssues: {
        "src/renderer/components/ui/*.tsx": ["exports", "types"],
      },
    },
  },
};
export default config;
