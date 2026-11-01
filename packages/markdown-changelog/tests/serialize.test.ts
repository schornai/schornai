import { serializeMDC } from "../src/serialize.ts";
import type { MDC } from "../src/types.ts";

describe("serializeMDC", () => {
  test("serializes a single version with correct column widths", () => {
    const mdc: MDC = {
      current: "hello",
      versions: [
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [{ action: "add", change: "hello", row: 1 }],
        },
      ],
    };

    const result = serializeMDC(mdc);
    expect(result).toBe(
      "hello\n# CHANGELOG\n\n" +
        "## Version 1\n\n" +
        "2026-01-01T00:00:00.000Z\n\n" +
        "| action | row | change  |\n" +
        "| ------ | --- | ------- |\n" +
        "| add    | 1   | `hello` |\n",
    );
  });

  test("pads shorter change values to the width of the longest", () => {
    const mdc: MDC = {
      current: "",
      versions: [
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [
            { action: "delete", change: "longer line here", row: 2 },
            { action: "add", change: "short", row: 2 },
          ],
        },
      ],
    };

    const result = serializeMDC(mdc);
    // longestChange = "longer line here".length + 2 = 18
    expect(result).toContain("| delete | 2   | `longer line here` |");
    expect(result).toContain("| add    | 2   | `short`            |");
  });

  test("serializes multiple versions separated by a blank line", () => {
    const mdc: MDC = {
      current: "body",
      versions: [
        {
          version: 2,
          date: new Date("2026-02-01T00:00:00.000Z"),
          changes: [{ action: "add", change: "new", row: 1 }],
        },
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [{ action: "delete", change: "old", row: 1 }],
        },
      ],
    };

    const result = serializeMDC(mdc);
    expect(result).toContain("## Version 2");
    expect(result).toContain("## Version 1");
    // The two version blocks are joined with "\n"
    const v2Index = result.indexOf("## Version 2");
    const v1Index = result.indexOf("## Version 1");
    expect(v2Index).toBeLessThan(v1Index);
  });

  test("escapes backticks in change values", () => {
    const mdc: MDC = {
      current: "",
      versions: [
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [{ action: "add", change: "use `code` here", row: 1 }],
        },
      ],
    };

    const result = serializeMDC(mdc);
    expect(result).toContain("`use \\`code\\` here`");
  });

  test("uses the custom changelogStart delimiter", () => {
    const mdc: MDC = {
      current: "doc",
      versions: [
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [{ action: "add", change: "x", row: 1 }],
        },
      ],
    };

    const result = serializeMDC(mdc, "\n## CHANGES");
    expect(result).toContain("\n## CHANGES\n");
    expect(result).not.toContain("# CHANGELOG");
  });
});
