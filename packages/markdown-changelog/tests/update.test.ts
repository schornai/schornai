import { updateMDC } from "../src/update.ts";
import { vi as jest } from "vitest";

describe("updateMDC", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("creates version 1 when there is no existing changelog", () => {
    const oldDoc = "line A\nline B\nline C";
    const newDoc = "line A\nline B modified\nline C";

    const result = updateMDC(oldDoc, newDoc);

    expect(result).toContain("## Version 1");
    expect(result).toContain("2026-01-01T00:00:00.000Z");
    expect(result).toContain("line A\nline B modified\nline C");
  });

  test("increments version number when an existing changelog is present", () => {
    const v1Doc =
      "line A\nline B modified\nline C\n# CHANGELOG\n\n## Version 1\n\n2026-01-01T00:00:00.000Z\n\n| action | row | change              |\n| ------ | --- | ------------------- |\n| delete | 2   | `line B`            |\n| add    | 2   | `line B modified`   |\n";

    const newDoc = "line A\nline B modified\nline C added";

    const result = updateMDC(v1Doc, newDoc);

    expect(result).toContain("## Version 2");
    expect(result).toContain("## Version 1");
  });

  test("ignores the changelog section in the new document", () => {
    const oldDoc = "content A";
    // The new doc already has a changelog — it should be ignored
    const newDocWithChangelog =
      "content B\n# CHANGELOG\n\n## Version 99\n\n2020-01-01T00:00:00.000Z\n\n| action | row | change |\n| ------ | --- | ------ |\n| add    | 1   | `x`    |\n";

    const result = updateMDC(oldDoc, newDocWithChangelog);

    // Version 99 from the new doc must not appear; only version 1 (fresh)
    expect(result).not.toContain("## Version 99");
    expect(result).toContain("## Version 1");
    expect(result).toContain("content B");
  });

  test("records the diff between old and new current content", () => {
    const oldDoc = "alpha\nbeta\ngamma";
    const newDoc = "alpha\ndelta\ngamma";

    const result = updateMDC(oldDoc, newDoc);

    expect(result).toContain("delete");
    expect(result).toContain("`beta`");
    expect(result).toContain("add");
    expect(result).toContain("`delta`");
  });

  test("produces a version with empty changes table when content is unchanged", () => {
    const doc = "no changes here";
    const result = updateMDC(doc, doc);

    expect(result).toContain("## Version 1");
    // Table header is always present; there should be no data rows
    expect(result).toContain("| action | row |");
    const lines = result.split("\n");
    const tableDataRows = lines.filter(
      (l) => l.startsWith("| add") || l.startsWith("| delete"),
    );
    expect(tableDataRows).toHaveLength(0);
  });
});
