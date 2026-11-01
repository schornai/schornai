import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  checkTranslations,
  runTranslationCheck,
} from "../../scripts/check-translations.mjs";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "aibox-i18n-"));
  roots.push(root);
  for (const language of ["de", "en", "fr"]) mkdirSync(join(root, language));
  for (const [language, label] of [
    ["de", "Speichern"],
    ["en", "Save"],
    ["fr", "Enregistrer"],
  ]) {
    writeFileSync(
      join(root, language!, "common.json"),
      JSON.stringify({ form: { label } }),
    );
  }
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

it("compares entry structure, allowing different translated values", () => {
  expect(checkTranslations(fixture())).toEqual({ errors: [], warnings: [] });
});

it("fails for missing primary files, nested entries and incompatible entry types", () => {
  const root = fixture();
  writeFileSync(join(root, "de", "new.json"), '{"title":"Neu"}');
  writeFileSync(
    join(root, "en", "common.json"),
    '{"form":"Save","extra":"Extra"}',
  );
  const result = checkTranslations(root);
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining("en/new.json: missing JSON"),
      expect.stringContaining("/form: entry type differs"),
      expect.stringContaining("/form/label: missing entry"),
      expect.stringContaining("/extra: extra entry"),
    ]),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  expect(runTranslationCheck(root)).toBe(1);
});

it("warns without failing for missing or extra secondary namespaces and entries", () => {
  const root = fixture();
  writeFileSync(
    join(root, "fr", "common.json"),
    '{"form":{},"stale":"Ancien"}',
  );
  writeFileSync(join(root, "fr", "old.json"), '{"label":"Ancien"}');
  mkdirSync(join(root, "uk"));
  const result = checkTranslations(root);
  expect(result.errors).toEqual([]);
  expect(result.warnings).toEqual(
    expect.arrayContaining([
      expect.stringContaining("fr/common.json/form/label: missing entry"),
      expect.stringContaining("fr/common.json/stale: extra entry"),
      expect.stringContaining("fr/old.json: extra JSON"),
      expect.stringContaining("uk/common.json: missing JSON"),
    ]),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  expect(runTranslationCheck(root)).toBe(0);
});

it("fails for malformed primary JSON and warns for malformed secondary JSON", () => {
  const root = fixture();
  writeFileSync(join(root, "en", "common.json"), "{");
  writeFileSync(join(root, "fr", "common.json"), '{"form":42}');
  const result = checkTranslations(root);
  expect(result.errors).toContainEqual(
    expect.stringContaining("en/common.json: invalid"),
  );
  expect(result.warnings).toContainEqual(
    expect.stringContaining("fr/common.json: invalid"),
  );
});

it("fails when a primary language is absent", () => {
  const root = fixture();
  rmSync(join(root, "de"), { recursive: true });
  expect(checkTranslations(root).errors).toContainEqual(
    expect.stringContaining("de: translation directory is missing"),
  );
});
