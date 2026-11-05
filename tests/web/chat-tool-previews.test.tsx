// @vitest-environment jsdom
import "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ChatMessagePartToolMCP } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolMCP";
import { ChatToolApprovalStorageTransferFile } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApprovalStorageTransferFile";
afterEach(cleanup);

it.each([
  { state: "output-error", expected: "errorRequest" },
  {
    state: "output-available",
    output: { isError: true },
    expected: "errorRequest",
  },
  { state: "output-denied", expected: "labelDenied" },
  {
    state: "approval-responded",
    approval: { approved: false },
    expected: "labelDenied",
  },
  {
    state: "approval-responded",
    approval: { approved: true },
    expected: "labelPending",
  },
  {
    state: "output-available",
    output: { isError: false },
    expected: "labelDone",
  },
  {
    state: "output-available",
    output: { result: "value" },
    expected: "labelDone",
  },
  { state: "output-available", output: "plain result", expected: "labelDone" },
  { state: "output-available", output: null, expected: "labelDone" },
  { state: "approval-requested", expected: "labelApproval" },
  { state: "input-streaming", expected: "labelPending" },
])(
  "displays MCP state $state as $expected without confusing errors and successes",
  ({ expected, ...part }) => {
    render(
      <ChatMessagePartToolMCP
        part={{ type: "tool-mcp", toolCallId: "call", ...part } as any}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `labelMCP: labelDiscover · ${expected}`,
      }),
    );
    expect(screen.getByRole("status").textContent).toBe(expected);
    expect(Boolean(screen.queryByText("labelResult"))).toBe("output" in part);
    expect(screen.queryByText("labelArguments")).toBeNull();
  },
);

it("expands arguments and output for a named MCP call and allows collapsing the details", () => {
  render(
    <ChatMessagePartToolMCP
      part={
        {
          type: "tool-mcp",
          toolCallId: "call",
          state: "output-available",
          input: { toolName: "list_files", arguments: { path: "/documents" } },
          output: { files: ["notes.txt"] },
        } as any
      }
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "labelMCP: list_files · labelDone" }),
  );
  expect(screen.getByText(/"path": "\/documents"/)).toBeTruthy();
  expect(screen.getByText(/"notes.txt"/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
  expect(
    screen
      .getByRole("button", { name: "labelMCP: list_files · labelDone" })
      .getAttribute("aria-expanded"),
  ).toBe("false");
});

it.each([
  { input: null, source: "—", target: "—", move: false },
  { input: "invalid", source: "—", target: "—", move: true },
  { input: {}, source: "—", target: "—", move: false },
  {
    input: { fromPath: 12, toPath: false },
    source: "—",
    target: "—",
    move: true,
  },
  {
    input: { fromPath: "/source.txt", toPath: "/folder/copy.txt" },
    source: "/source.txt",
    target: "/folder/copy.txt",
    move: false,
  },
  {
    input: { fromPath: "/source.txt", toPath: "/folder/moved.txt" },
    source: "/source.txt",
    target: "/folder/moved.txt",
    move: true,
  },
])(
  "previews only valid source and destination paths (move=$move)",
  ({ input, source, target, move }) => {
    const { container } = render(
      <ChatToolApprovalStorageTransferFile input={input} move={move} />,
    );
    expect(screen.getByText(move ? "labelMove" : "labelCopy")).toBeTruthy();
    expect(
      [...container.querySelectorAll("dd")].map((item) => item.textContent),
    ).toEqual([source, target]);
  },
);
