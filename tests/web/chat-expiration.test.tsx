// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ChatExpirationSettings } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatExpirationSettings";
import { ChatContext } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatContext";
const mocks = vi.hoisted(() => ({ provider: { on: vi.fn(), off: vi.fn() } }));
vi.mock(
  "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_actions/setChatExpiration",
  () => ({ setChatExpiration: vi.fn() }),
);
vi.mock("@/lib/RealtimeRoom", () => ({
  RealtimeRoom: ({ children }: any) => children,
}));
vi.mock("@hocuspocus/provider-react", () => ({
  useHocuspocusProvider: () => mocks.provider,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  client.pending = false;
  client.actionErrored = false;
});
const props = {
  agentId: "agent",
  activityId: "activity",
  expiration: { seconds: null, expiresAt: null },
};
it("enables exactly twelve hours with one click and reflects revalidated state", () => {
  const view = render(<ChatExpirationSettings {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "labelEnable" }));
  expect(client.execute).toHaveBeenCalledWith({
    agentId: "agent",
    activityId: "activity",
    seconds: 43200,
  });
  expect(screen.queryByRole("dialog")).toBeNull();
  view.rerender(
    <ChatExpirationSettings
      {...props}
      expiration={{ seconds: 43200, expiresAt: "2030-01-01T12:00:00Z" }}
    />,
  );
  expect(
    screen
      .getByRole("button", { name: "labelDisable" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "labelDisable" }));
  expect(client.execute).toHaveBeenLastCalledWith({
    agentId: "agent",
    activityId: "activity",
    seconds: null,
  });
});
it("prevents duplicate submission while pending", () => {
  client.pending = true;
  render(<ChatExpirationSettings {...props} />);
  const button = screen.getByRole("button", {
    name: "labelEnable",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(client.execute).not.toHaveBeenCalled();
});
it("leaves the expired chat on a server deletion event and cleans up its listener", () => {
  const view = render(
    <ChatContext agentId="agent" activityId="activity">
      Chat
    </ChatContext>,
  );
  const handler = mocks.provider.on.mock.calls[0]![1];
  handler({ payload: "invalid" });
  handler({ payload: '{"type":"other"}' });
  expect(client.replace).not.toHaveBeenCalled();
  handler({ payload: '{"type":"chat-deleted"}' });
  expect(client.replace).toHaveBeenCalledWith("/activity");
  view.unmount();
  expect(mocks.provider.off).toHaveBeenCalledWith("stateless", handler);
});

it("keeps the active deadline after a failed save, shows an error and allows retry", async () => {
  client.actionErrored = true;
  render(
    <ChatExpirationSettings
      {...props}
      expiration={{ seconds: 43200, expiresAt: "2030-01-01T12:00:00Z" }}
    />,
  );
  const button = screen.getByRole("button", { name: "labelDisable" });
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(button.querySelector(".lucide-circle-x")).not.toBeNull();
  expect(button.querySelector(".lucide-clock-fading")).toBeNull();
  await userEvent.hover(button);
  expect(await screen.findByText("errorSave")).toBeTruthy();
  await userEvent.click(button);
  expect(client.execute).toHaveBeenCalledWith({
    agentId: props.agentId,
    activityId: props.activityId,
    seconds: null,
  });
});
