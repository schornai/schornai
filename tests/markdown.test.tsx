// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Markdown } from "../packages/ui/src/components/markdown";
import { MarkdownProse } from "../packages/ui/src/components/markdown-prose";
import { Math as MathComponent } from "../packages/ui/src/components/math";
vi.mock("../packages/ui/src/components/code", () => ({
  Code: ({ children, lang }: any) => <pre data-language={lang}>{children}</pre>,
}));
vi.mock("../packages/ui/src/components/error-log", () => ({
  logError: vi.fn(),
}));
afterEach(cleanup);

it("renders headings, emphasis, lists, links, images, code, breaks and tables", () => {
  const markdown =
    "# Title\n\n**bold** and *emphasis* and ~~deleted~~ and `inline`\n\n[Local](/local) ![Image](/image.png)\n\n- Item\n\n1. First\n\n- [x] Complete\n- [ ] Pending\n\n---\n\nA  \nB\n\n```typescript\nconst a = 1;\n```\n\n| Left | Center | Right |\n| :--- | :----: | ----: |\n| one | two | three |";
  const { container } = render(<MarkdownProse>{markdown}</MarkdownProse>);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Title");
  expect(container.querySelector("strong")!.textContent).toBe("bold");
  expect(container.querySelector("em")!.textContent).toBe("emphasis");
  expect(container.querySelector("del")!.textContent).toBe("deleted");
  expect(screen.getByRole("link").getAttribute("href")).toBe("/local");
  expect(screen.getByRole("img").getAttribute("alt")).toBe("Image");
  expect(container.querySelector("pre")!.getAttribute("data-language")).toBe(
    "typescript",
  );
  expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
    "one",
    "two",
    "three",
  ]);
  expect(container.querySelector("hr")).not.toBeNull();
  expect(container.querySelector("br")).not.toBeNull();
});

it.each(["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"])(
  "renders GitHub %s alerts without their marker",
  (type) => {
    render(
      <Markdown>{`> [!${type}]\n> Message\n>\n> Second paragraph`}</Markdown>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Message");
    expect(screen.getByRole("alert").textContent).not.toContain(`[!${type}]`);
  },
);

it("keeps raw HTML inert, recognizes br and renders ordinary blockquotes", () => {
  const view = render(
    <Markdown>
      {"<script>alert(1)</script>\n\n<br>\n\n> **Quote**\n\n> Regular"}
    </Markdown>,
  );
  expect(view.container.querySelector("script")).toBeNull();
  expect(view.container.textContent).toContain("<script>");
  expect(view.container.querySelector("br")).not.toBeNull();
  expect(view.container.querySelectorAll("blockquote")).toHaveLength(2);
  view.rerender(
    <Markdown>
      {
        {
          type: "blockquote",
          children: [
            {
              type: "heading",
              depth: 2,
              children: [{ type: "text", value: "Heading" }],
            },
          ],
        } as any
      }
    </Markdown>,
  );
  expect(screen.getByRole("heading").textContent).toBe("Heading");
});

it("handles empty ASTs, missing table rows, empty code and images without alt text", () => {
  const view = render(<Markdown />);
  expect(view.container.textContent).toBe("");
  view.rerender(
    <Markdown>
      {
        [
          { type: "code", value: "" },
          { type: "table", children: [], align: [] },
          { type: "image", url: "/image" },
        ] as any
      }
    </Markdown>,
  );
  expect(view.container.querySelector("pre")).toBeNull();
  expect(view.container.querySelector("table")).not.toBeNull();
  expect(view.container.querySelector("img")!.hasAttribute("alt")).toBe(false);
  view.rerender(
    <Markdown>
      {
        {
          type: "table",
          children: [
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header" }],
                },
              ],
            },
          ],
        } as any
      }
    </Markdown>,
  );
  expect(screen.getByRole("columnheader").textContent).toBe("Header");
  view.rerender(
    <table>
      <tbody>
        <Markdown>
          {
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Cell" }],
                },
              ],
            } as any
          }
        </Markdown>
      </tbody>
    </table>,
  );
  expect(screen.getByRole("cell").textContent).toBe("Cell");
  view.rerender(<Markdown>{{ type: "code", value: "plain" } as any}</Markdown>);
  expect(view.container.querySelector("pre")!.textContent).toBe("plain");
});

it.each([
  "definition",
  "footnoteDefinition",
  "footnoteReference",
  "imageReference",
  "linkReference",
  "mdxJsxFlowElement",
  "mdxJsxTextElement",
  "yaml",
])("reports unsupported %s nodes explicitly", (type) => {
  render(<Markdown>{{ type } as any}</Markdown>);
  expect(screen.getByText(`Not implemented: ${type}`)).not.toBeNull();
});

it("rejects unknown AST nodes", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() =>
    render(<Markdown>{{ type: "unknown-node" } as any}</Markdown>),
  ).toThrow("ExhaustiveError");
});

it("renders math and clears invalid formulas when props change", async () => {
  const view = render(<MathComponent>x^2</MathComponent>);
  expect(view.container.querySelector(".katex")).not.toBeNull();
  view.rerender(<MathComponent>{"\\invalidCommand"}</MathComponent>);
  expect(view.container.textContent).toBe("");
  view.rerender(<MathComponent />);
  expect(view.container.querySelector(".katex")).not.toBeNull();
  view.rerender(<Markdown>{"$x$\n\n$$\ny^2\n$$"}</Markdown>);
  await waitFor(() =>
    expect(view.container.querySelectorAll(".katex")).toHaveLength(2),
  );
});
