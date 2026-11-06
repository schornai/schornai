import { expect, it } from "vitest";
import { scope } from "../scripts/test-scope.mjs";

it("covers application and independently deployed service sources without counting test fixtures", () => {
  expect(scope.files).toContain(
    "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePart.tsx",
  );
  expect(scope.files).toContain("apps/admin-mac/src/main.ts");
  expect(scope.files).toContain("apps/cli/bin/schornai.js");
  expect(scope.files).toContain("packages/service/src/bootstrap.ts");
  expect(scope.files).toContain("packages/service/src/cli.ts");
  expect(
    scope.files.some(
      (file) =>
        /\/(stories|\.storybook)\//.test(file) ||
        /\.(stories|test|spec)\./.test(file),
    ),
  ).toBe(false);
  expect(
    scope.files.some((file) => /(?:forge|vite\.[^.]+)\.config\./.test(file)),
  ).toBe(false);
});
