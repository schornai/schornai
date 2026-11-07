// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "../packages/ui/src/components/message-scroller";
afterEach(cleanup);
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
it.each(["start", "end"] as const)(
  "composes messages and an accessible scroll-to-%s action",
  (direction) => {
    render(
      <MessageScrollerProvider>
        <MessageScroller className="custom-root">
          <MessageScrollerViewport aria-label="Conversation">
            <MessageScrollerContent>
              <MessageScrollerItem>First message</MessageScrollerItem>
              <MessageScrollerItem scrollAnchor>
                Latest message
              </MessageScrollerItem>
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton direction={direction} />
        </MessageScroller>
      </MessageScrollerProvider>,
    );
    expect(screen.getByText("First message")).toBeTruthy();
    expect(screen.getByText("Latest message")).toBeTruthy();
    const button = screen.getByRole("button", {
      name: `Scroll to ${direction}`,
    });
    expect(button.dataset.direction).toBe(direction);
    expect(button.dataset.variant).toBe("secondary");
    expect(
      screen
        .getByLabelText("Conversation")
        .closest('[data-slot="message-scroller"]')
        ?.classList.contains("custom-root"),
    ).toBe(true);
  },
);
it("supports custom action content and rendering while keeping default direction", () => {
  render(
    <MessageScrollerProvider>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>
            <MessageScrollerItem>Message</MessageScrollerItem>
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton render={<button />} variant="outline" size="sm">
          Latest
        </MessageScrollerButton>
      </MessageScroller>
    </MessageScrollerProvider>,
  );
  const button = screen.getByRole("button", { name: "Latest" });
  expect(button.dataset.direction).toBe("end");
  expect(button.dataset.variant).toBe("outline");
  expect(button.dataset.size).toBe("sm");
});
