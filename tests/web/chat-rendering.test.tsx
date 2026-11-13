// @vitest-environment jsdom
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMessage } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessage";
import { ChatMessageFooter } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessageFooter";
import {
  ChatMessagePart,
  ChatMessagePartIcon,
} from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePart";
const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  tile: vi.fn(),
  clipboard: vi.fn(),
  messages: undefined as any,
  error: undefined as string | undefined,
  activities: [] as any[],
}));
vi.mock("../../apps/web/app/_components/StorageViewProvider", () => ({
  useStorageView: () => ({
    storage: { type: "activity", agentId: "agent", activityId: "activity" },
    basePathApp: "/files",
  }),
}));
vi.mock("../../apps/web/app/_components/StorageObjectTile", () => ({
  StorageObjectTile: (props: any) => {
    mocks.tile(props);
    return (
      <a href={`${props.basePathApp}/${props.storageObject.path}`}>
        {props.storageObject.name}
      </a>
    );
  },
}));
vi.mock("../../apps/web/app/_components/StorageFilePreview", () => ({
  StorageFilePreview: (props: any) => {
    mocks.preview(props);
    return <div>{props.fileContent.current ?? "Transcript"}</div>;
  },
}));
vi.mock("@schornio/aibox-package-ui/components/message-scroller", () => ({
  MessageScrollerItem: ({ children }: any) => children,
}));
afterEach(cleanup);
beforeEach(() => {
  mocks.error = undefined;
  client.execute.mockClear();
  client.pending = false;
  mocks.preview.mockClear();
  mocks.tile.mockClear();
  mocks.clipboard.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.clipboard },
  });
});
const storage = {
  type: "documentRepository",
  documentRepositoryId: "repo",
  workspaceId: "workspace",
};
const file = {
  file: true,
  name: "File.txt",
  path: "file.txt",
  type: "text/plain",
};
function expand() {
  fireEvent.click(screen.getAllByRole("button")[0]);
}
describe("chat message rendering", () => {
  it("keeps text outside step groups and drops invisible step boundaries", () => {
    render(
      <ChatMessage
        message={
          {
            id: "answer",
            role: "assistant",
            parts: [
              { type: "step-start" },
              { type: "reasoning", text: "Think", state: "done" },
              { type: "text", text: "Answer" },
              { type: "reasoning", text: "More", state: "streaming" },
              {
                type: "dynamic-tool",
                toolName: "custom",
                toolCallId: "tool",
                state: "input-streaming",
                input: {},
              },
            ],
          } as any
        }
      />,
    );
    expect(screen.getByText("Answer")).toBeTruthy();
    expect(screen.getByText("2 Schritte")).toBeTruthy();
    expect(screen.queryByText("step-start")).toBeNull();
  });
  it.each(["image.png", "file.txt"])(
    "renders user text and attachment %s",
    (path) => {
      render(
        <ChatMessage
          message={
            {
              id: "user",
              role: "user",
              parts: [
                { type: "text", text: "Question" },
                { type: "data-file", data: { name: path, url: path } },
              ],
            } as any
          }
        />,
      );
      expect(screen.getByText("Question")).toBeTruthy();
      expect(
        screen.getByRole("link", { name: path }).getAttribute("href"),
      ).toBe(`/files/${path}`);
      expect(mocks.tile.mock.lastCall![0].variant).toBe(
        path.endsWith(".png") ? "tiles-medium" : "tiles-small",
      );
    },
  );
  it.each([
    "reasoning",
    "tool-storage-list",
    "tool-storage-read-file",
    "tool-storage-write-file",
    "tool-storage-search",
    "dynamic-tool",
    "tool-mcp",
    "tool-storage-copy-file",
    "tool-storage-move-file",
    "tool-web-fetch",
    "tool-web-search",
  ])("provides an icon for %s", (partType) => {
    const result = render(<ChatMessagePartIcon partType={partType as any} />);
    expect(result.container.querySelector("svg")).toBeTruthy();
  });

  it.each([
    "tool-mcp",
    "tool-storage-copy-file",
    "tool-storage-move-file",
    "tool-web-fetch",
    "tool-web-search",
    "dynamic-tool",
  ])("renders persisted %s tool failures in the message dispatcher", (type) => {
    const view = render(
      <ChatMessagePart
        part={
          {
            type,
            toolCallId: "tool",
            toolName: "custom",
            state: "output-error",
            errorText: "Tool unavailable",
            input: {
              url: "https://example.test",
              query: "query",
              sourcePath: "source.txt",
              targetPath: "target.txt",
              name: "custom",
              arguments: {},
            },
          } as any
        }
      />,
    );
    expect(view.container.textContent).toBeTruthy();
    const button = view.container.querySelector("button");
    if (button) fireEvent.click(button);
    expect(view.container.querySelector("svg")).toBeTruthy();
  });
  it.each([
    undefined,
    { ok: false },
    { ok: true, content: [], storage },
    { ok: true, content: [file], storage, storageParent: { path: "base" } },
  ])("renders storage-list output %j", (output) => {
    render(
      <ChatMessagePart
        part={
          { type: "tool-storage-list", input: { path: "/docs" }, output } as any
        }
      />,
    );
    expand();
    if (output?.ok === false) expect(screen.getByText("Fehler")).toBeTruthy();
    if (output?.ok && output.content.length === 0)
      expect(screen.getByText("Keine Dateien")).toBeTruthy();
    if (output?.ok && output.content.length)
      expect(screen.getByRole("link", { name: "File.txt" })).toBeTruthy();
  });
  it.each([
    undefined,
    { ok: false },
    { ok: true, content: [] },
    {
      ok: true,
      content: [
        {
          file,
          storage,
          storagePath: "files/file.txt",
          digest: "matched text",
          digestOffset: 42,
        },
      ],
    },
  ])("renders search output %j", (output) => {
    render(
      <ChatMessagePart
        part={
          {
            type: "tool-storage-search",
            input: { keywords: ["term", "other"] },
            output,
          } as any
        }
      />,
    );
    expand();
    if (output?.ok === false) expect(screen.getByText("Fehler")).toBeTruthy();
    if (output?.ok && output.content.length === 0)
      expect(screen.getByText("Keine Ergebnisse")).toBeTruthy();
    if (output?.ok && output.content.length)
      expect(screen.getByText(/matched text/)).toBeTruthy();
  });
  it.each(["tool-storage-read-file", "tool-storage-write-file"])(
    "renders successful and failed %s responses",
    (type) => {
      const part = {
        type,
        input: { path: "file.txt", content: "Updated" },
        output: {
          ok: true,
          content: "Read content",
          contentLength: 12,
          totalLength: 12,
          file,
          storage,
          storagePath: "file.txt",
        },
      };
      const view = render(<ChatMessagePart part={part as any} />);
      expand();
      expect(
        screen
          .getByRole("button", { name: "Zum Dokument" })
          .getAttribute("href"),
      ).toContain("file.txt");
      expect(mocks.preview.mock.lastCall![0].fileContent.current).toBe(
        type.includes("read") ? "Read content" : "Updated",
      );
      view.rerender(
        <ChatMessagePart part={{ ...part, output: { ok: false } } as any} />,
      );
      expect(screen.getByText("Fehler")).toBeTruthy();
    },
  );
  it("hides empty footers and copies all text parts in order", async () => {
    const view = render(
      <ChatMessageFooter
        message={{ id: "answer", role: "assistant", parts: [] }}
      />,
    );
    expect(view.container.textContent).toBe("");
    view.rerender(
      <ChatMessageFooter
        message={
          {
            id: "answer",
            role: "assistant",
            parts: [
              { type: "text", text: "One" },
              { type: "reasoning", text: "Secret" },
              { type: "text", text: "Two" },
            ],
          } as any
        }
      />,
    );
    await act(async () => fireEvent.click(screen.getByRole("button")));
    expect(mocks.clipboard).toHaveBeenCalledWith("One\n\nTwo");
    mocks.clipboard.mockRejectedValueOnce(new Error("clipboard denied"));
    await act(async () => fireEvent.click(screen.getByRole("button")));
  });
  it("shows token statistics when usage is supplied", () => {
    render(
      <ChatMessageFooter
        message={
          {
            id: "answer",
            role: "assistant",
            parts: [],
            metadata: {
              usage: { inputTokens: 42, outputTokens: 10 },
              timing: {
                inputDuration: 20,
                outputDuration: 1000,
                totalDuration: 1020,
              },
            },
          } as any
        }
      />,
    );
    expand();
    expect(screen.getByText(/Eingabe-Tokens/).textContent).toContain("42");
  });
});

import { ChatMessageItems } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessageItems";
import { ChatMessagePartUserText } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartUserText";
vi.mock(
  "../../apps/web/app/(main)/_components/ActivityContextProvider",
  () => ({ useActivites: () => ({ activities: mocks.activities }) }),
);
vi.mock(
  "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatContext",
  () => ({
    useMessages: () => mocks.messages,
    useChatError: () => mocks.error,
  }),
);
it.each([undefined, "idle", "running", "error"])(
  "renders ordered messages and the activity indicator for state %s",
  (state) => {
    mocks.messages = [
      { id: "first", role: "user", parts: [{ type: "text", text: "First" }] },
      {
        id: "second",
        role: "assistant",
        parts: [{ type: "text", text: "Second" }],
      },
    ];
    mocks.error = state === "error" ? "Model unavailable\nHTTP 503" : undefined;
    mocks.activities = state ? [{ id: "activity", state }] : [];
    const view = render(
      <ChatMessageItems
        agentId="agent"
        activityId="activity"
        agentColor={{ type: "color-oklch-hue", oklchHue: 100 }}
      />,
    );
    expect(view.container.textContent).toMatch(/First.*Second/s);
    expect(!!view.container.querySelector(".animate-ping")).toBe(
      state === "running",
    );
    expect(Boolean(screen.queryByRole("button", { name: "labelRetry" }))).toBe(
      state === "error",
    );
    if (state === "error") {
      fireEvent.click(screen.getByRole("button", { name: /labelDetails/ }));
      expect(screen.getByText(/HTTP 503/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "labelRetry" }));
      expect(client.execute).toHaveBeenCalledWith({
        agentId: "agent",
        activityId: "activity",
      });
    }
  },
);
it("shows errors even when no messages were recorded and disables retry while pending", () => {
  mocks.messages = [];
  mocks.error = "";
  client.pending = true;
  render(
    <ChatMessageItems
      agentId="agent"
      activityId="activity"
      agentColor={{ type: "color-oklch-hue", oklchHue: 100 }}
    />,
  );
  expect(screen.getByText("descriptionFailed")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "labelRetry" }).hasAttribute("disabled"),
  ).toBe(true);
});
it.each([undefined, []])(
  "shows the agent empty state without an action button %j",
  (messages) => {
    mocks.messages = messages;
    const view = render(
      <ChatMessageItems
        agentId="agent"
        activityId="activity"
        agentColor={{ type: "color-oklch-hue", oklchHue: 100 }}
      />,
    );
    expect(view.container.textContent).toContain("labelTitle");
    expect(view.container.textContent).toContain("descriptionEmpty");
    expect(screen.queryByRole("button")).toBeNull();
  },
);
it.each([undefined, "Short", "x".repeat(181)])(
  "expands and collapses only long user messages %j",
  (text) => {
    const view = render(<ChatMessagePartUserText text={text} />);
    if ((text?.length ?? 0) > 180) {
      expect(view.container.textContent).toContain("…");
      fireEvent.click(screen.getByRole("button", { name: "Show more" }));
      expect(view.container.textContent).toContain(text);
      fireEvent.click(screen.getByRole("button", { name: "Show less" }));
      expect(view.container.textContent).toContain("…");
    } else expect(screen.queryByRole("button")).toBeNull();
  },
);

it.each([
  ["CONTEXT_BUDGET_EXCEEDED", "errorContextBudget"],
  ["CONTEXT_COMPRESSION_FAILED", "errorContextCompression"],
  ["TASK_WORKER_LOST", "errorWorkerLost"],
  ["TOOL_INPUT_INTERRUPTED", "errorToolInputInterrupted"],
  ["ROLE_NOT_FOUND", "errorRoleNotFound"],
  ["Agent role no longer available", "errorRoleNotFound"],
  ["TOOL_APPROVAL_ROLE_NOT_FOUND", "errorApprovalRoleNotFound"],
  ["TOOL_APPROVAL_ROLES_MISMATCH", "errorApprovalRolesMismatch"],
  ["MODEL_API_KEY_REQUIRED", "errorModelApiKey"],
  ["MODEL_REGION_REQUIRED", "errorModelRegion"],
  ["An error occurred.", "descriptionFailed"],
  ["   ", "descriptionFailed"],
  ["Unknown provider error\nAdditional details", "Unknown provider error"],
  ["x".repeat(141), `${"x".repeat(140)}…`],
  ["constructor", "constructor"],
  ["  CONTEXT_BUDGET_EXCEEDED\r\nAdditional details  ", "errorContextBudget"],
])(
  "shows a readable summary for %s and preserves details",
  (error, summary) => {
    mocks.error = error;
    render(
      <ChatMessageItems
        agentId="agent"
        activityId="activity"
        agentColor={{ type: "color-oklch-hue", oklchHue: 100 }}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(summary);
    fireEvent.click(screen.getByRole("button", { name: /labelDetails/ }));
    expect(document.querySelector("pre")?.textContent).toBe(
      error.trim() || "descriptionNoDetails",
    );
  },
);
