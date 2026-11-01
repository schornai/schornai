import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { scope } from "./scripts/test-scope.mjs";
import { escapePath } from "tinyglobby";

const local = (file: string) => fileURLToPath(new URL(file, import.meta.url));
const realtimeRequire = createRequire(local("./apps/realtime/package.json"));
const webRequire = createRequire(local("./apps/web/package.json"));
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)/, replacement: local("./apps/web/") + "$1" },
      {
        find: /^@schornio\/aibox-(?:package-)?database\/(.*)/,
        replacement: local("./packages/database/src/") + "$1",
      },
      { find: /^ai$/, replacement: realtimeRequire.resolve("ai") },
      {
        find: /^ai-sdk-ollama$/,
        replacement: realtimeRequire.resolve("ai-sdk-ollama"),
      },
      {
        find: /^@ai-sdk\/mcp$/,
        replacement: realtimeRequire.resolve("@ai-sdk/mcp"),
      },
      {
        find: /^@supabase\/ssr$/,
        replacement: webRequire.resolve("@supabase/ssr"),
      },
    ],
    dedupe: ["react", "react-dom", "yjs", "ai-sdk-ollama"],
  },
  oxc: { jsx: { runtime: "automatic" }, target: "esnext" },
  test: {
    globals: true,
    maxWorkers: 1,
    include: [
      "tests/**/*.test.{ts,tsx}",
      "apps/**/*.test.{ts,tsx}",
      "packages/**/*.test.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/venv/**"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: scope.files.map(escapePath),
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text", "html", "json", "json-summary"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
        ...Object.fromEntries(
          [
            ...new Set(
              scope.files.map((file) => file.split("/").slice(0, 2).join("/")),
            ),
          ].map((workspace) => [`${workspace}/**`, { lines: 90 }]),
        ),
      },
    },
  },
});
