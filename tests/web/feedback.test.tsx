// @vitest-environment jsdom
vi.mock("next-i18next/client", () => ({
  useT: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FeedbackContext,
  feedbackToText,
  useFeedback,
} from "../../apps/web/app/feedback/_components/FeedbackContext";
import { StarRatingCard } from "../../apps/web/app/feedback/_components/StarRatingCard";
import { Actions } from "../../apps/web/app/feedback/_components/Actions";
import { ErrorLogs } from "../../apps/web/app/feedback/_components/ErrorLogs";
const mocks = vi.hoisted(() => ({
  logs: [] as any[],
  send: vi.fn(),
  sends: vi.fn(),
  remove: vi.fn(),
  clipboard: vi.fn(),
}));
vi.mock("@schornio/aibox-package-ui/components/error-log", () => ({
  setSendError: mocks.send,
  setSendErrors: mocks.sends,
  deleteErrors: mocks.remove,
}));
vi.mock("@schornio/aibox-package-ui/components/error-log-client", () => ({
  useErrorLogs: () => mocks.logs,
}));
afterEach(cleanup);
beforeEach(() => {
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockReset();
  mocks.logs = [];
  mocks.clipboard.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.clipboard },
  });
});
function State() {
  const { feedback } = useFeedback();
  return <output>{JSON.stringify(feedback)}</output>;
}
function state() {
  return JSON.parse(screen.getByRole("status").textContent!);
}
describe("feedback", () => {
  it("includes ratings and text but only explicitly selected error logs", () => {
    const result = feedbackToText(
      { starsClicked: 4, textFeedback: "Useful app" },
      [
        {
          id: "selected",
          date: new Date("2026-01-01"),
          message: "Selected error",
          send: true,
        },
        {
          id: "private",
          date: new Date(),
          message: "Private error",
          send: false,
        },
      ],
    );
    expect(result).toContain("Stars: 4 / 5");
    expect(result).toContain("Useful app");
    expect(result).toContain("2026-01-01T00:00:00.000Z");
    expect(result).toContain("Selected error");
    expect(result).not.toContain("Private error");
    expect(feedbackToText({ starsClicked: 0 }, [])).toBe(
      "Auto generated feedback:\n\n",
    );
  });
  it("requires a feedback provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<State />)).toThrow("not inside");
    spy.mockRestore();
  });
  it("selects, previews and clears each star rating", () => {
    render(
      <FeedbackContext>
        <StarRatingCard />
        <State />
      </FeedbackContext>,
    );
    const buttons = screen.getAllByRole("button");
    for (const [index, button] of buttons.entries()) {
      fireEvent.mouseEnter(button);
      expect(state().starsHovered).toBe(index + 1);
      fireEvent.click(button);
      expect(state().starsClicked).toBe(index + 1);
      fireEvent.click(button);
      expect(state().starsClicked).toBe(0);
    }
    fireEvent.mouseLeave(buttons[0].parentElement!);
    expect(state().starsHovered).toBeUndefined();
  });
  it("prepares an email link and copies feedback through the clipboard", async () => {
    render(
      <FeedbackContext>
        <Actions />
      </FeedbackContext>,
    );
    expect(
      screen.getByRole("button", { name: "sendFeedback" }).getAttribute("href"),
    ).toContain("body=Auto%20generated%20feedback");
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "copyFeedbackToClipboard" }),
      ),
    );
    expect(mocks.clipboard).toHaveBeenCalledWith(
      "Auto generated feedback:\n\n",
    );
    mocks.clipboard.mockRejectedValueOnce(new Error("denied"));
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "copyFeedbackToClipboard" }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "showFeedbackText" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
  it("hides the error table when there are no logs", () => {
    const view = render(
      <FeedbackContext>
        <ErrorLogs />
      </FeedbackContext>,
    );
    expect(view.container.textContent).toBe("");
  });
  it("selects individual logs, toggles all and confirms deleting the log list", async () => {
    mocks.logs = [
      {
        id: "error",
        date: new Date("2026-01-01"),
        message: "Visible error",
        send: false,
      },
    ];
    const view = render(
      <FeedbackContext>
        <ErrorLogs />
      </FeedbackContext>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(mocks.send).toHaveBeenCalledWith("error", true);
    fireEvent.click(
      screen.getAllByRole("button", { name: "actionSelectAll" })[0],
    );
    expect(mocks.sends).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByText("Visible error"));
    expect(screen.getByText("Visible error").className).not.toContain(
      "max-h-20",
    );
    mocks.logs[0].send = true;
    view.rerender(
      <FeedbackContext>
        <ErrorLogs />
      </FeedbackContext>,
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "actionDeselectAll" })[0],
    );
    expect(mocks.sends).toHaveBeenCalledWith(false);
    fireEvent.click(
      screen.getAllByRole("button", { name: "actionDeleteAll" })[0],
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "actionDeleteAllShort" }),
    );
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});

import { TextFeedback } from "../../apps/web/app/feedback/_components/TextFeedback";
it("writes text feedback and requires confirmation before discarding it", async () => {
  render(
    <FeedbackContext>
      <TextFeedback />
      <State />
    </FeedbackContext>,
  );
  fireEvent.click(screen.getByRole("button", { name: "writeFeedback" }));
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "My feedback" },
  });
  expect(state().textFeedback).toBe("My feedback");
  fireEvent.click(screen.getByRole("button", { name: "discardFeedback" }));
  const dialog = await screen.findByRole("alertdialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: "discardFeedback" }),
  );
  expect(state().textFeedback).toBeUndefined();
  expect(screen.getByRole("button", { name: "writeFeedback" })).toBeTruthy();
});
