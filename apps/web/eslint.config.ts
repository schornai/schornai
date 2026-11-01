import { defineConfig, globalIgnores } from "eslint/config";
// https://github.com/vercel/next.js/issues/89764
// import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { reactStrict } from "@schornio/aibox-eslint-config/react-strict";

export default defineConfig(
  ...reactStrict,
  // ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "postcss.config.mjs",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@hocuspocus/provider-react",
              importNames: [
                "HocuspocusRoom",
                "HocuspocusProviderWebsocketComponent",
              ],
              message:
                "Use RealtimeRoom and RealtimeProvider from @/lib so cached routes can resume safely.",
            },
          ],
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
