// @vitest-environment jsdom
import "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ChatMessagePartToolSupport } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolSupport";
import type { ComponentProps } from "react";

type Part = ComponentProps<typeof ChatMessagePartToolSupport>["part"];
afterEach(cleanup);
function open(part: Part) {
  render(<ChatMessagePartToolSupport part={part} />);
  fireEvent.click(screen.getByRole("button"));
}

it("shows the calculated result when expanded", () => {
  open({
    type: "tool-calculator",
    toolCallId: "c",
    state: "output-available",
    input: { expression: "2+3" },
    output: { ok: true, expression: "2+3", result: 5 },
  });
  expect(screen.getByText("5").tagName).toBe("STRONG");
});

it.each([true, false])(
  "distinguishes updated and preserved titles: %s",
  (updated) => {
    open({
      type: "tool-chat-set-label",
      toolCallId: "t",
      state: "output-available",
      input: { label: "Suggested" },
      output: { ok: true, label: "Actual", updated },
    });
    expect(screen.getByText(/Actual/)).toBeTruthy();
    expect(Boolean(screen.queryByText(/labelManualTitlePreserved/))).toBe(
      !updated,
    );
  },
);

it("displays the returned local time and zone", () => {
  open({
    type: "tool-chat-current-date-time",
    toolCallId: "d",
    state: "output-available",
    input: { timeZone: "Europe/Vienna" },
    output: {
      ok: true,
      local: "11:00 CET",
      timeZone: "Europe/Vienna",
      iso: "2026-11-08T10:00:00.000Z",
      unixMilliseconds: 1794132000000,
    },
  });
  expect(screen.getByText("11:00 CET (Europe/Vienna)")).toBeTruthy();
});

it("renders suggestions as separate list items", () => {
  open({
    type: "tool-chat-response-suggestions",
    toolCallId: "s",
    state: "output-available",
    input: { suggestions: ["Continue", "Example"] },
    output: { ok: true, suggestions: ["Continue", "Example"] },
  });
  expect(
    screen.getAllByRole("listitem").map((item) => item.textContent),
  ).toEqual(["Continue", "Example"]);
});

const types = [
  "tool-calculator",
  "tool-chat-set-label",
  "tool-chat-current-date-time",
  "tool-chat-response-suggestions",
] as const;
it.each(types)("renders streaming %s before input exists", (type) => {
  open({ type, toolCallId: "pending", state: "input-streaming" });
  expect(screen.getByRole("status").textContent).toBe("labelPending");
  if (type === "tool-chat-current-date-time")
    expect(screen.getByText("UTC")).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();
});
it.each(types)("renders failed %s without a successful result", (type) => {
  open({
    type,
    toolCallId: "failed",
    state: "output-available",
    input: {},
    output: { ok: false, error: "Invalid input" },
  } as Part);
  expect(screen.getByRole("alert").textContent).toContain("Invalid input");
  expect(screen.queryByRole("list")).toBeNull();
});
