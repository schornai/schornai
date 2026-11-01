import { expect, it, vi } from "vitest";
import { supportedLanguages } from "../apps/web/lib/languages";
const boundary = vi.hoisted(() => ({
  readFile: vi.fn().mockResolvedValue('{"message":"Development resource"}'),
}));
vi.mock("fs/promises", () => ({ readFile: boundary.readFile }));
it.each(["development", "test"])(
  "loads every supported language in %s mode",
  async (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.resetModules();
    const { default: config } = await import("../apps/web/i18n.config");
    expect(config.supportedLngs).toEqual(supportedLanguages);
    expect(config.fallbackLng).toBe("de");
    expect(config.i18nextOptions?.preload).toEqual([]);
    expect(config.reloadOnPrerender).toBe(mode === "development");
    for (const language of supportedLanguages) {
      const resource = await config.resourceLoader!(language, "common");
      expect(resource).toBeTruthy();
      if (mode === "development") {
        expect(resource).toEqual({ message: "Development resource" });
        expect(boundary.readFile).toHaveBeenCalledWith(
          expect.stringContaining(`app/i18n/locales/${language}/common.json`),
          "utf-8",
        );
      }
    }
  },
);
