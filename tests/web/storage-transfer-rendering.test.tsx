// @vitest-environment jsdom
import "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { ChatMessagePartToolStorageTransferFile as Transfer } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageTransferFile";
import story from "../../apps/web/stories/_components/ChatMessagePartToolStorageTransferFile.ChatMessagePartToolStorageTransferFile.stories";
afterEach(cleanup);
type Part = ComponentProps<typeof Transfer>["part"];
const completed = story.args.part;
it.each(["tool-storage-copy-file", "tool-storage-move-file"] as const)(
  "updates %s from input to completion and supports expanding/closing",
  (type) => {
    const part = { ...completed, type };
    const view = render(
      <Transfer
        part={{ ...part, state: "input-streaming", output: undefined }}
      />,
    );
    expect(screen.getByRole("button").textContent).toContain(
      "descriptionPending",
    );
    view.rerender(
      <Transfer
        part={{ ...part, state: "input-available", output: undefined }}
      />,
    );
    expect(screen.getByRole("button").textContent).toContain(
      "descriptionRunning",
    );
    view.rerender(<Transfer part={part} />);
    expect(screen.getByRole("button").textContent).toContain(
      "descriptionSuccess",
    );
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("link").getAttribute("href")).toContain(
      "/files/notes.txt",
    );
    fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
    expect(
      screen.getAllByRole("button")[0]!.getAttribute("aria-expanded"),
    ).toBe("false");
  },
);
it.each([
  ["output-denied", { id: "approval", approved: false }, "descriptionDenied"],
  [
    "approval-responded",
    { id: "approval", approved: false },
    "descriptionDenied",
  ],
  ["approval-requested", { id: "approval" }, "descriptionApproval"],
  [
    "approval-responded",
    { id: "approval", approved: true },
    "descriptionRunning",
  ],
  ["output-error", undefined, "errorTransfer"],
  ["output-available", undefined, "errorTransfer"],
] as const)(
  "renders %s without claiming that a terminal result is still pending",
  (state, approval, expected) => {
    render(
      <Transfer
        part={
          {
            ...completed,
            state,
            approval,
            output: undefined,
            errorText: "Transfer failed",
          } as Part
        }
      />,
    );
    expect(screen.getByRole("button").textContent).toContain(expected);
    expect(screen.getByRole("button").textContent).not.toContain(
      "descriptionPending",
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("link")).toBeNull();
  },
);
it("reports a processing failure as a completed transfer and retains the destination link", () => {
  render(
    <Transfer
      part={{
        ...completed,
        output: {
          ...completed.output,
          processing: "error",
          storagePath: "folder/a #?.txt",
        },
      }}
    />,
  );
  expect(screen.getByRole("button").textContent).toContain(
    "descriptionProcessingError",
  );
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("link").getAttribute("href")).toContain(
    "folder/a%20%23%3F.txt",
  );
});
it("shows a failed transfer without offering a destination link", () => {
  render(
    <Transfer
      part={{
        ...completed,
        output: { ok: false, error: "Destination exists" },
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("alert").textContent).toContain("Destination exists");
  expect(screen.queryByRole("link")).toBeNull();
});
