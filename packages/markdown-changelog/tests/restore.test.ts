import { restoreVersion } from "../src/restore.ts";
import type { MDC } from "../src/types.ts";

describe("restoreVersion", () => {
  test("restores content to before a single version was applied", () => {
    // Version 1 changed line 2: deleted "original" and added "modified"
    const mdc: MDC = {
      current: "line A\nmodified\nline C",
      versions: [
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [
            { action: "delete", change: "original", row: 2 },
            { action: "add", change: "modified", row: 2 },
          ],
        },
      ],
    };

    const restored = restoreVersion(mdc, 1);
    expect(restored).toBe("line A\noriginal\nline C");
  });

  test("restores content to before the target version (reverts all newer versions too)", () => {
    // v1 added line 2; v2 further changed line 3
    const original = "line A\nline C";
    const afterV1 = "line A\nline B\nline C";
    const afterV2 = "line A\nline B\nline D";

    const mdc: MDC = {
      current: afterV2,
      versions: [
        {
          version: 2,
          date: new Date("2026-02-01T00:00:00.000Z"),
          changes: [
            { action: "delete", change: "line C", row: 3 },
            { action: "add", change: "line D", row: 3 },
          ],
        },
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [{ action: "add", change: "line B", row: 2 }],
        },
      ],
    };

    // Restore to before v1: reverts both v2 and v1
    const restoredToV1 = restoreVersion(mdc, 1);
    expect(restoredToV1).toBe(original);

    // Restore to before v2: reverts only v2
    const restoredToV2 = restoreVersion(mdc, 2);
    expect(restoredToV2).toBe(afterV1);
  });

  test("reverts an 'add' change by removing the added line", () => {
    const mdc: MDC = {
      current: "first\nnewly added\nsecond",
      versions: [
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [{ action: "add", change: "newly added", row: 2 }],
        },
      ],
    };

    const restored = restoreVersion(mdc, 1);
    expect(restored).toBe("first\nsecond");
  });

  test("reverts a 'delete' change by reinserting the deleted line", () => {
    const mdc: MDC = {
      current: "first\nsecond",
      versions: [
        {
          version: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          changes: [{ action: "delete", change: "removed line", row: 2 }],
        },
      ],
    };

    const restored = restoreVersion(mdc, 1);
    expect(restored).toBe("first\nremoved line\nsecond");
  });
});
