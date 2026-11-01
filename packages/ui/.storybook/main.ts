import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },

  staticDirs: ["./public"],
  core: { disableTelemetry: true },
  async viteFinal(base) {
    return mergeConfig(base, {
      build: { chunkSizeWarningLimit: 1500 },
    });
  },
};
export default config;
