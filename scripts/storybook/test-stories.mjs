import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const baseURL = process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006";
const index = await fetch(`${baseURL}/index.json`).then((response) =>
  response.json(),
);
const ids = Object.values(index.entries)
  .filter((entry) => entry.type === "story")
  .filter(
    (entry) =>
      !process.env.STORYBOOK_TAG ||
      entry.tags?.includes(process.env.STORYBOOK_TAG),
  )
  .map((entry) => entry.id)
  .filter(
    (id) =>
      !process.env.STORYBOOK_FILTER ||
      new RegExp(process.env.STORYBOOK_FILTER).test(id),
  );
if (!ids.length) throw new Error("No stories matched the requested filter.");
const workers = Number(process.env.STORYBOOK_WORKERS ?? 3);
if (!Number.isInteger(workers) || workers < 1)
  throw new Error("STORYBOOK_WORKERS must be a positive integer.");
const browser = await chromium.launch({
  ...(process.env.STORYBOOK_BROWSER_CHANNEL
    ? { channel: process.env.STORYBOOK_BROWSER_CHANNEL }
    : {}),
  headless: true,
});
process.on("SIGINT", async () => {
  await browser.close();
  process.exit(130);
});
const failures = [];
let cursor = 0;
let passed = 0;
await Promise.all(
  Array.from({ length: Math.min(workers, ids.length) }, async () => {
    const page = await browser.newPage();
    let initialized = false;
    let renderErrors = [];
    page.on("pageerror", (error) => renderErrors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        message.text().includes("Error rendering story")
      )
        renderErrors.push(message.text());
    });
    await page.addInitScript(() => {
      let channel;
      window.__storybookResult = null;
      Object.defineProperty(window, "__STORYBOOK_ADDONS_CHANNEL__", {
        configurable: true,
        get: () => channel,
        set: (value) => {
          channel = value;
          for (const event of [
            "storyFinished",
            "storyErrored",
            "storyThrewException",
            "storyMissing",
            "playFunctionThrewException",
          ]) {
            value.on(event, (payload) => {
              if (
                window.__storybookResult?.event !== "storyFinished" &&
                window.__storybookResult
              )
                return;
              window.__storybookResult = { event, payload };
            });
          }
        },
      });
    });
    while (cursor < ids.length) {
      const id = ids[cursor++];
      if (process.env.STORYBOOK_VERBOSE) console.log("START", id);
      let result;
      renderErrors = [];
      try {
        if (!initialized || process.env.STORYBOOK_ISOLATED === "1") {
          await page.goto(`${baseURL}/iframe.html?id=${id}&viewMode=story`, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });
          initialized = true;
        } else {
          await page.evaluate((storyId) => {
            window.__storybookResult = null;
            window.__STORYBOOK_ADDONS_CHANNEL__.emit("setCurrentStory", {
              storyId,
              viewMode: "story",
            });
          }, id);
        }
        await page.waitForFunction(() => window.__storybookResult, null, {
          timeout: 15000,
          polling: 50,
        });
        // Suspended server components can fail after Storybook's initial completion event.
        await page.waitForTimeout(
          index.entries[id].tags?.includes("async-component") ? 1000 : 250,
        );
        result = await page.evaluate(() => window.__storybookResult);
        if (renderErrors.length)
          result = { event: "renderError", errors: renderErrors };
      } catch (error) {
        initialized = false;
        result = {
          event: "timeout",
          message: error.message,
          text: await page
            .locator("body")
            .innerText()
            .catch(() => ""),
        };
      }
      if (
        result.event === "storyFinished" &&
        result.payload?.status !== "error"
      )
        passed++;
      else {
        failures.push({ id, ...result });
        console.log("FAIL", id, JSON.stringify(result).slice(0, 400));
      }
      if ((passed + failures.length) % 25 === 0)
        console.log(
          `${passed} passed, ${failures.length} failed / ${ids.length}`,
        );
    }
    await page.close();
  }),
);
await browser.close();
const report = { baseURL, total: ids.length, passed, failures };
if (process.env.STORYBOOK_REPORT)
  await writeFile(
    process.env.STORYBOOK_REPORT,
    JSON.stringify(report, null, 2),
  );
console.log(
  `${passed}/${ids.length} stories passed; ${failures.length} failures.`,
);
if (failures.length) process.exitCode = 1;
