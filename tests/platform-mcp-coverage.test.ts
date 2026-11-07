import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import coverage from "./fixtures/platform-mcp-coverage.json";
import { createPlatformTools } from "../packages/realtime/src/platform/tools.ts";
import type { PlatformContext } from "../packages/realtime/src/platform/registry.ts";
const catalog = createPlatformTools({
  claims: "admin",
  level: "admin",
} as PlatformContext);
describe("platform capability coverage", () => {
  it("accounts for every web server action with tools or an explicit OAuth protocol boundary", () => {
    const sources = globSync("apps/web/{app,lib}/**/*.ts")
      .filter((path) => readFileSync(path, "utf8").startsWith('"use server"'))
      .sort();
    expect(Object.keys(coverage).sort()).toEqual(sources);
    const names = new Set(catalog.map((t) => t.name));
    for (const entry of Object.values(coverage)) {
      if ("tools" in entry) {
        expect(entry.tools.length).toBeGreaterThan(0);
        for (const name of entry.tools)
          expect(names.has(name), name).toBe(true);
      } else expect(entry.protocol.length).toBeGreaterThan(40);
    }
  });
  it("documents every real tool in the German catalog", () => {
    const documentation = readFileSync(
      "docs/de/agent/edit/plattformzugriff.md",
      "utf8",
    );
    for (const tool of catalog)
      expect(documentation, tool.name).toContain("`" + tool.name + "`");
  });
});

it("gives every platform tool a German and English UI title", () => {
  for (const language of ["de", "en"]) {
    const messages = JSON.parse(
      readFileSync(`apps/web/app/i18n/locales/${language}/agent.json`, "utf8"),
    );
    for (const tool of catalog)
      expect(
        messages._components.PlatformToolPreview.tools[tool.name],
        `${language}: ${tool.name}`,
      ).toBeTruthy();
  }
});
