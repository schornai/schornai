// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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
});
const props = {
  agentId: "agent",
  activityId: "activity",
  expiration: { seconds: null, expiresAt: null },
};
it("validates duration and submits a fixed timer without losing the draft", () => {
  render(<ChatExpirationSettings {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "labelOpen" }));
  const amount = screen.getByRole("spinbutton");
  fireEvent.change(amount, { target: { value: "366" } });
  expect(
    (screen.getByRole("button", { name: "labelSave" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(amount, { target: { value: "2" } });
  fireEvent.submit(amount.closest("form")!);
  expect(client.execute).toHaveBeenCalledWith({
    agentId: "agent",
    activityId: "activity",
    seconds: 172800,
  });
  expect(screen.getByRole("dialog")).toBeTruthy();
  act(() => client.actionOptions.onSuccess());
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("can disable an active timer and prevents duplicate submission while pending", () => {
  const active = {
    ...props,
    expiration: { seconds: 3600, expiresAt: "2030-01-01T12:00:00Z" },
  };
  const view = render(<ChatExpirationSettings {...active} />);
  fireEvent.click(screen.getByRole("button", { name: "labelScheduled" }));
  fireEvent.click(screen.getByRole("button", { name: "labelDisable" }));
  expect(client.execute).toHaveBeenCalledWith({
    agentId: "agent",
    activityId: "activity",
    seconds: null,
  });
  client.pending = true;
  view.rerender(<ChatExpirationSettings {...active} />);
  expect(
    (screen.getByRole("button", { name: "labelSave" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.submit(screen.getByRole("spinbutton").closest("form")!);
  expect(client.execute).toHaveBeenCalledTimes(1);
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
