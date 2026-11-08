import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// A page per worker keeps module/font caches warm for synchronous stories.
// Async stories navigate afresh so pending RSC/Suspense work from the previous
// selection cannot replace content after the current story's play checks pass.
const test = base.extend({
  visualPage: [
    async ({ browser }, use, workerInfo) => {
      const page = await browser.newPage({ ...workerInfo.project.use });
      await page.clock.setFixedTime(new Date("2026-01-15T12:00:00.000Z"));
      await page.exposeBinding("__visualHover", async ({ frame }) => {
        await frame
          .locator('[data-visual-hover-target="true"]')
          .hover({ timeout: 5000 });
      });
      await page.addInitScript(
        (captureCSS) => {
          // Storybook recognizes its test runner and skips animation wait timeouts.
          const userAgent = navigator.userAgent;
          Object.defineProperty(navigator, "userAgent", {
            get: () => `${userAgent} StorybookTestRunner`,
          });
          const freezeAnimations = () => {
            const style = document.createElement("style");
            style.textContent = captureCSS;
            document.head.appendChild(style);
          };
          if (document.head) freezeAnimations();
          else
            addEventListener("DOMContentLoaded", freezeAnimations, {
              once: true,
            });
          let channel;
          window.__visualStoryId = new URL(location.href).searchParams.get(
            "id",
          );
          window.__visualResult = null;
          window.__visualErrors = [];
          window.__visualHoverPromise = null;
          window.__visualHoverTarget = null;
          // DOM userEvent.hover does not activate the browser's CSS :hover state.
          addEventListener(
            "pointerover",
            (event) => {
              if (
                !event.isTrusted &&
                window.__visualStoryId?.endsWith("--hover") &&
                event.target instanceof Element
              ) {
                window.__visualHoverTarget?.removeAttribute(
                  "data-visual-hover-target",
                );
                window.__visualHoverTarget = event.target;
                event.target.setAttribute("data-visual-hover-target", "true");
                window.__visualHoverPromise = window
                  .__visualHover()
                  .catch((error) => window.__visualErrors.push(String(error)));
              }
            },
            true,
          );
          addEventListener("error", (event) =>
            window.__visualErrors.push(event.message),
          );
          addEventListener("unhandledrejection", (event) =>
            window.__visualErrors.push(String(event.reason)),
          );
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
                    payload?.storyId &&
                    payload.storyId !== window.__visualStoryId
                  )
                    return;
                  if (
                    window.__visualResult &&
                    window.__visualResult.event !== "storyFinished"
                  )
                    return;
                  window.__visualResult = { event, payload };
                });
              }
            },
          });
        },
        readFileSync("tests/visual/screenshot.css", "utf8"),
      );
      page.on("console", async (message) => {
        if (
          message.type() === "error" &&
          message.text().includes("Error rendering story")
        )
          await page
            .evaluate(
              (text) => window.__visualErrors.push(text),
              message.text(),
            )
            .catch(() => {});
      });
      await use(page);
      await page.close();
    },
    { scope: "worker" },
  ],
});
const port = Number(process.env.STORYBOOK_VISUAL_PORT ?? 6106);
let count = 0;
for (const [book, directory] of [
  ["web", "apps/web"],
  ["ui", "packages/ui"],
  ["admin", "apps/admin-mac"],
]) {
  const index = JSON.parse(
    readFileSync(`${directory}/storybook-static/index.json`, "utf8"),
  );
  for (const story of Object.values(index.entries)) {
    if (story.type !== "story") continue;
    if (
      process.env.STORYBOOK_FILTER &&
      !new RegExp(process.env.STORYBOOK_FILTER).test(story.id)
    )
      continue;
    if (
      process.env.STORYBOOK_VISUAL_BOOK &&
      process.env.STORYBOOK_VISUAL_BOOK !== book
    )
      continue;
    count++;
    test(`${book}: ${story.id}`, async ({ visualPage: page }, testInfo) => {
      const theme = testInfo.project.name;
      await page.mouse.move(0, 0);
      const url = `http://127.0.0.1:${port}/${book}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=theme:${theme};locale:de`;
      if (
        story.tags?.includes("async-component") ||
        !page.url().includes(`/${book}/iframe.html`)
      ) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
      } else {
        await page.evaluate((storyId) => {
          window.__visualResult = null;
          window.__visualErrors = [];
          window.__visualStoryId = storyId;
          window.__visualHoverPromise = null;
          window.__visualHoverTarget = null;
          window.__STORYBOOK_ADDONS_CHANNEL__.emit("setCurrentStory", {
            storyId,
            viewMode: "story",
          });
        }, story.id);
      }
      await page.waitForFunction(() => window.__visualResult, null, {
        polling: 50,
      });
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => window.__visualHoverPromise);
      expect(await page.evaluate(() => window.__visualErrors)).toEqual([]);
      if (story.id.endsWith("--hover"))
        expect(
          await page.evaluate(() =>
            window.__visualHoverTarget?.matches(":hover"),
          ),
          "Hover stories must activate the browser's CSS hover state",
        ).toBe(true);
      // React can resolve Suspense after Storybook's initial completion event.
      if (story.tags?.includes("async-component"))
        await page.waitForTimeout(500);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          Array.from(document.images).map((image) =>
            image.decode().catch(() => {}),
          ),
        );
      });
      const result = await page.evaluate(() => ({
        ...window.__visualResult,
        errors: window.__visualErrors,
      }));
      expect(result.errors, "Story must render without browser errors").toEqual(
        [],
      );
      expect(result.event, JSON.stringify(result.payload)).toBe(
        "storyFinished",
      );
      expect(result.payload?.status).not.toBe("error");
      expect(result.payload?.storyId).toBe(story.id);
      await expect(page).toHaveScreenshot([book, `${story.id}.png`], {
        fullPage: true,
      });
    });
  }
}
if (!count) throw new Error("No visual stories matched the requested filters.");
