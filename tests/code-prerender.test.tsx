import { expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("shiki", () => {
  throw new Error("Shiki must not initialize during prerendering");
});
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

it("prerenders the code provider and fallback without importing Shiki", async () => {
  const { Code, CodeProvider } =
    await import("../packages/ui/src/components/code");
  expect(
    renderToString(
      <CodeProvider>
        <Code lang="typescript" fallback={<pre>const answer = 42</pre>}>
          const answer = 42
        </Code>
      </CodeProvider>,
    ),
  ).toContain("<pre>const answer = 42</pre>");
});
