import { parseMDC } from "../src/parse.ts";

describe("parseMDC", () => {
  test("document with no changelog returns full doc as current and empty versions", () => {
    const doc = "# Hello\n\nSome content.";
    const result = parseMDC(doc);
    expect(result.current).toBe(doc);
    expect(result.versions).toEqual([]);
  });

  test("document starting with changelog marker has empty current", () => {
    const doc =
      "\n# CHANGELOG\n\n## Version 1\n\n2026-01-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| add    | 1   | `foo`  |\n";
    const result = parseMDC(doc);
    expect(result.current).toBe("");
    expect(result.versions).toHaveLength(1);
  });

  test("parses version number, date, and row changes", () => {
    const doc =
      "content\n# CHANGELOG\n\n## Version 3\n\n2026-06-15T12:00:00.000Z\n\n| action | row | change     |\n| ------ | --- | ---------- |\n| add    | 2   | `line 2`   |\n| delete | 5   | `line 5`   |\n";
    const result = parseMDC(doc);
    expect(result.current).toBe("content");
    expect(result.versions).toHaveLength(1);
    const [v] = result.versions;
    expect(v.version).toBe(3);
    expect(v.date).toEqual(new Date("2026-06-15T12:00:00.000Z"));
    expect(v.changes).toEqual([
      { action: "add", change: "line 2", row: 2 },
      { action: "delete", change: "line 5", row: 5 },
    ]);
  });

  test("parses multiple versions in newest-first order", () => {
    const doc =
      "body\n# CHANGELOG\n\n## Version 2\n\n2026-02-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| add    | 1   | `a`    |\n\n## Version 1\n\n2026-01-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| delete | 3   | `b`    |\n";
    const result = parseMDC(doc);
    expect(result.versions).toHaveLength(2);
    expect(result.versions[0].version).toBe(2);
    expect(result.versions[1].version).toBe(1);
  });

  test("respects a custom changelogStart delimiter", () => {
    const doc =
      "hello\n## CHANGES\n\n## Version 1\n\n2026-01-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| add    | 1   | `x`    |\n";
    const result = parseMDC(doc, "\n## CHANGES");
    expect(result.current).toBe("hello");
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].version).toBe(1);
  });

  test("changelog in current content is preserved when changelogStart not present", () => {
    const doc = "# CHANGELOG\n\nThis is not parsed as a changelog.";
    const result = parseMDC(doc);
    expect(result.current).toBe(doc);
    expect(result.versions).toEqual([]);
  });

  test("throws when version heading text does not match 'Version <number>'", () => {
    const doc =
      "content\n# CHANGELOG\n\n## Release One\n\n2026-01-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| add    | 1   | `x`    |\n";
    expect(() => parseMDC(doc)).toThrow(/Expected: "Version <number>"/);
  });

  test("throws when action is not 'add' or 'delete'", () => {
    const doc =
      "content\n# CHANGELOG\n\n## Version 1\n\n2026-01-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| update | 1   | `x`    |\n";
    expect(() => parseMDC(doc)).toThrow(/Expected: "add" or "delete"/);
  });

  test("throws when row cell is not a number", () => {
    const doc =
      "content\n# CHANGELOG\n\n## Version 1\n\n2026-01-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| add    | abc | `x`    |\n";
    expect(() => parseMDC(doc)).toThrow(/Expected: number/);
  });
});
