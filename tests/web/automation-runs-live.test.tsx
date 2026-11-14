// @vitest-environment jsdom
import { client } from "./client-setup";
import { EventEmitter } from "node:events";
import { Doc } from "yjs";
import type { ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import { getAutomationRunsUpdates } from "@schornio/aibox-realtime/documents/automationRuns/_schema";
import { AutomationRunsLive } from "../../apps/web/app/(main)/app/automation/_components/AutomationRunsLive";
import { savedAutomation } from "../../apps/web/stories/(main)/app/automation/fixtures";

vi.mock("@/lib/RealtimeRoom", () => ({
  RealtimeRoom: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@hocuspocus/provider-react", () => ({
  useHocuspocusProvider: () => provider,
}));
const provider = Object.assign(new EventEmitter(), {
  document: new Doc(),
  isSynced: true,
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  provider.document = new Doc();
  provider.isSynced = true;
  client.refresh.mockClear();
});
afterEach(() => {
  cleanup();
  provider.document.destroy();
  provider.removeAllListeners();
});

it("refreshes on Yjs changes and reconnection, preserving local search and cleaning up observers", () => {
  const pending = {
    id: "run",
    activity_id: "chat",
    state: "pending" as const,
    event: {},
    error_code: null,
    created_at: "2026-11-14T08:00:00Z",
    finished_at: null,
  };
  const result = render(
    <AutomationRunsLive automation={savedAutomation} runs={[pending]} />,
    { wrapper: SidebarProvider },
  );
  expect(client.refresh).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "2026" } });
  const updates = getAutomationRunsUpdates(provider.document);
  act(() => updates.set("revision", "started"));
  expect(client.refresh).toHaveBeenCalledTimes(2);
  act(() => updates.set("revision", "queued"));
  expect(client.refresh).toHaveBeenCalledTimes(3);
  result.rerender(
    <AutomationRunsLive
      automation={savedAutomation}
      runs={[
        { ...pending, state: "queued", finished_at: "2026-11-14T08:00:02Z" },
      ]}
    />,
  );
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("2026");
  expect(screen.queryByText("states.pending")).toBeNull();
  expect(screen.getByText("states.queued")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "labelOpenChat" }).getAttribute("href"),
  ).toContain("/chat");
  act(() => provider.emit("status", { status: "disconnected" }));
  expect(screen.getByText("descriptionRunsConnecting")).toBeTruthy();
  act(() => updates.set("revision", "missed-update"));
  expect(client.refresh).toHaveBeenCalledTimes(3);
  act(() => provider.emit("synced", { state: true }));
  expect(client.refresh).toHaveBeenCalledTimes(4);
  expect(screen.queryByText("descriptionRunsConnecting")).toBeNull();
  result.unmount();
  act(() => updates.set("revision", "after-unmount"));
  expect(client.refresh).toHaveBeenCalledTimes(4);
  expect(provider.listenerCount("synced")).toBe(0);
});
