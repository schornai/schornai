// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Code,
  CodeProvider,
  useCode,
} from "../packages/ui/src/components/code";
const state = vi.hoisted(() => ({
  create: vi.fn(),
  theme: "light",
  log: vi.fn(),
}));
vi.mock("shiki", () => ({ createHighlighter: state.create }));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: state.theme }),
}));
vi.mock("../packages/ui/src/components/error-log", () => ({
  logError: state.log,
}));
const highlighter = {
  codeToHast: vi.fn((code: string) => ({
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [{ type: "text", value: code }],
      },
    ],
  })),
};
afterEach(cleanup);
beforeEach(() => {
  state.create.mockReset().mockResolvedValue(highlighter);
  state.log.mockClear();
  highlighter.codeToHast.mockClear();
  state.theme = "light";
});
describe("syntax highlighting", () => {
  it("shows fallback while loading, renders highlighted code and responds to theme changes", async () => {
    const view = render(
      <CodeProvider>
        <Code lang="typescript" fallback={<span>Loading</span>}>
          const answer = 42
        </Code>
      </CodeProvider>,
    );
    expect(screen.getByText("Loading")).toBeTruthy();
    await screen.findByText("const answer = 42");
    expect(state.create).toHaveBeenCalledWith({
      langs: ["typescript"],
      themes: ["one-light"],
    });
    expect(highlighter.codeToHast).toHaveBeenCalledWith("const answer = 42", {
      lang: "typescript",
      theme: "one-light",
    });
    state.theme = "dark";
    view.rerender(
      <CodeProvider>
        <Code lang="typescript">new code</Code>
      </CodeProvider>,
    );
    await screen.findByText("new code");
    expect(state.create).toHaveBeenCalledWith({
      langs: ["typescript"],
      themes: ["one-dark-pro"],
    });
  });
  it("caches pending and loaded highlighters for the same language/theme", async () => {
    const pending = Promise.withResolvers<any>();
    state.create.mockReturnValue(pending.promise);
    const { result } = renderHook(useCode, { wrapper: CodeProvider });
    let first: any;
    act(() => {
      first = result.current.getHighlighter("text", "one-light");
    });
    expect(first.highlighterPromise).toBeInstanceOf(Promise);
    expect(
      result.current.getHighlighter("text", "one-light").highlighterPromise,
    ).toBe(first.highlighterPromise);
    await waitFor(() => expect(state.create).toHaveBeenCalledOnce());
    await act(async () => {
      pending.resolve(highlighter);
      await first.highlighterPromise;
    });
    expect(result.current.getHighlighter("text", "one-light").highlighter).toBe(
      highlighter,
    );
    expect(state.create).toHaveBeenCalledOnce();
  });
  it("logs rejected highlighter loads without an unhandled rejection", async () => {
    const error = new Error("unsupported language");
    state.create.mockRejectedValue(error);
    render(
      <CodeProvider>
        <Code fallback={<span>Fallback</span>}>content</Code>
      </CodeProvider>,
    );
    await waitFor(() =>
      expect(state.log).toHaveBeenCalledWith(
        "useCode() highlighterPromise",
        error,
      ),
    );
    expect(screen.getByText("Fallback")).toBeTruthy();
  });
  it("does not render after unmount and handles omitted code with the text language", async () => {
    const pending = Promise.withResolvers<any>();
    state.create.mockReturnValue(pending.promise);
    const view = render(
      <CodeProvider>
        <Code />
      </CodeProvider>,
    );
    view.unmount();
    await act(async () => pending.resolve(highlighter));
    expect(view.container.innerHTML).toBe("");
    state.create.mockResolvedValue(highlighter);
    render(
      <CodeProvider>
        <Code />
      </CodeProvider>,
    );
    await waitFor(() =>
      expect(highlighter.codeToHast).toHaveBeenCalledWith("", {
        lang: "text",
        theme: "one-light",
      }),
    );
  });
  it("requires a provider when requesting a highlighter", () => {
    const { result } = renderHook(useCode);
    expect(() => result.current.getHighlighter("text", "one-light")).toThrow(
      /within a CodeProvider/,
    );
  });
});
