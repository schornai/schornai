import type { StorybookConfig } from "@storybook/nextjs-vite";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import { serverBoundaries } from "./server-boundaries";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  staticDirs: ["../public", "./public"],
  features: { experimentalRSC: true },
  core: { disableTelemetry: true },
  async viteFinal(base) {
    return mergeConfig(base, {
      plugins: [serverBoundaries()],
      resolve: {
        alias: {
          "next/dist/client/components/redirect-boundary.js": fileURLToPath(
            new URL("./mocks/next-redirect-boundary.tsx", import.meta.url),
          ),
          "@/lib/RealtimeProvider": fileURLToPath(
            new URL("./mocks/hocuspocus.tsx", import.meta.url),
          ),
          "@/lib/RealtimeRoom": fileURLToPath(
            new URL("./mocks/hocuspocus.tsx", import.meta.url),
          ),
          "@/lib": fileURLToPath(new URL("../lib", import.meta.url)),
          "@schornio/aibox-package-ui/hooks/use-decay-action-state":
            fileURLToPath(
              new URL("./mocks/decay-action-state.ts", import.meta.url),
            ),
          "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider":
            fileURLToPath(
              new URL("./mocks/realtime-server.ts", import.meta.url),
            ),
          "@schornio/aibox-realtime/_lib/aiboxModelEmbedding": fileURLToPath(
            new URL("./mocks/realtime-server.ts", import.meta.url),
          ),
          "@hocuspocus/provider-react": fileURLToPath(
            new URL("./mocks/hocuspocus.tsx", import.meta.url),
          ),
          "tus-js-client": fileURLToPath(
            new URL("./mocks/tus.ts", import.meta.url),
          ),
          "next-safe-action/hooks": fileURLToPath(
            new URL("./mocks/action-hooks.ts", import.meta.url),
          ),
          "next-i18next/server": fileURLToPath(
            new URL("./mocks/i18n-server.ts", import.meta.url),
          ),
        },
      },
      build: { chunkSizeWarningLimit: 1500 },
    });
  },
};
export default config;
