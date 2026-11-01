import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const port = Number(process.env.STORYBOOK_VISUAL_PORT ?? 6106);
export default defineConfig({
  testDir: ".",
  testMatch: "storybook.visual.spec.mjs",
  fullyParallel: true,
  workers: Number(process.env.STORYBOOK_VISUAL_WORKERS ?? 4),
  timeout: 60000,
  retries: 0,
  forbidOnly: !!process.env.CI,
  updateSnapshots: "none",
  outputDir: resolve("test-results/storybook-visual"),
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}",
  reporter: [
    ["line"],
    [
      "html",
      {
        outputFolder: resolve("playwright-report/storybook-visual"),
        open: "never",
      },
    ],
    [
      "json",
      { outputFile: resolve("test-results/storybook-visual/report.json") },
    ],
  ],
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      threshold: 0.2,
      maxDiffPixels: 0,
      stylePath: resolve("tests/visual/screenshot.css"),
    },
  },
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    locale: "de-AT",
    timezoneId: "Europe/Vienna",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(process.env.STORYBOOK_BROWSER_CHANNEL
      ? { channel: process.env.STORYBOOK_BROWSER_CHANNEL }
      : {}),
  },
  projects: ["light", "dark"].map((theme) => ({
    name: theme,
    use: { colorScheme: theme },
  })),
  webServer: {
    command: "node scripts/storybook/serve-static.mjs",
    cwd: resolve("."),
    url: `http://127.0.0.1:${port}/web/index.json`,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
