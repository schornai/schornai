import { expect, it } from "vitest";
import { parseMDC } from "../packages/markdown-changelog/src/parse";
const prefix = "Text\n# CHANGELOG\n";
it.each([
  "Text instead of heading",
  "# **Version 1**",
  "# Version nope",
  "# Version 1",
  "# Version 1\n\n**2026-01-01**",
  "# Version 1\n\n2026-01-01\n\nNot a table",
])("rejects malformed changelog structure %j", (body) => {
  expect(() => parseMDC(prefix + body)).toThrow();
});
it("rejects invalid dates and treats empty change cells as blank", () => {
  expect(() =>
    parseMDC(
      prefix +
        "# Version 1\n\nnot-a-date\n\n| Action | Row | Change |\n|---|---|---|\n| add | 1 | `new` |",
    ),
  ).toThrow('Expected: "date"');
  const result = parseMDC(
    prefix +
      "# Version 1\n\n2026-01-01\n\n| Action | Row | Change |\n|---|---|---|\n| add | 1 | |\n| delete | 2 | plain |",
  );
  expect(result.versions[0].changes.map((change) => change.change)).toEqual([
    "",
    "",
  ]);
});
