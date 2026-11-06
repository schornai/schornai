// @vitest-environment jsdom
import { client } from "./client-setup";
import { EventEmitter } from "node:events";
import { Doc } from "yjs";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArtifactContext } from "../../apps/web/app/(settings)/artifacts/_components/ArtifactContext";
import { useRealtimeRoomConnected } from "../../apps/web/lib/useRealtimeRoomConnected";
import { addArtifactLog } from "../../packages/realtime/src/documents/artifactCatalog/_utils";
import { serviceArtifacts } from "../../apps/web/stories/(settings)/service/fixtures";

const realtime = vi.hoisted(() => ({
  provider: undefined as any,
  room: vi.fn(),
  dashboard: vi.fn(),
}));
vi.mock("@hocuspocus/provider-react", () => ({
  useHocuspocusProvider: () => realtime.provider,
}));
vi.mock("../../apps/web/lib/RealtimeRoom", () => ({
  RealtimeRoom: ({ name, children }: any) => {
    realtime.room(name);
    return children;
  },
}));
vi.mock(
  "../../apps/web/app/(settings)/artifacts/_components/ArtifactDashboard",
  () => ({
    ArtifactDashboard: (props: any) => {
      realtime.dashboard(props);
      return <div>{props.connected ? "connected" : "disconnected"}</div>;
    },
  }),
);
const providers: any[] = [];
function provider(isSynced = false) {
  const value = Object.assign(new EventEmitter(), {
    isSynced,
    document: new Doc(),
  });
  providers.push(value);
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
  realtime.provider = provider();
});
afterEach(() => {
  cleanup();
  for (const value of providers.splice(0)) value.document.destroy();
});

it("tracks synchronization and disconnection and detaches listeners when the provider changes", () => {
  const original = realtime.provider;
  const { result, rerender, unmount } = renderHook(useRealtimeRoomConnected);
  expect(result.current).toBe(false);
  act(() => original.emit("status", { status: "connected" }));
  expect(result.current).toBe(false);
  act(() => {
    original.isSynced = true;
    original.emit("synced", { state: true });
  });
  expect(result.current).toBe(true);
  act(() => original.emit("status", { status: "disconnected" }));
  expect(result.current).toBe(false);
  act(() => original.emit("status", { status: "connected" }));
  expect(result.current).toBe(true);
  realtime.provider = provider(false);
  rerender();
  expect(result.current).toBe(false);
  expect(original.listenerCount("status")).toBe(0);
  expect(original.listenerCount("synced")).toBe(0);
  unmount();
  expect(realtime.provider.listenerCount("status")).toBe(0);
  expect(realtime.provider.listenerCount("synced")).toBe(0);
});

it.each([false, true])(
  "reconciles the authoritative artifact snapshot on reconnect (initially synced=$initiallySynced)",
  (initiallySynced) => {
    realtime.provider.isSynced = initiallySynced;
    const preferences = { view: "table", sort: "name:asc", group: "no-group" };
    const { unmount } = render(
      <ArtifactContext
        artifacts={[serviceArtifacts[0]!]}
        userPreferences={preferences}
      />,
    );
    expect(realtime.room).toHaveBeenCalledWith("artifactCatalog");
    expect(realtime.dashboard).toHaveBeenLastCalledWith({
      artifacts: [serviceArtifacts[0]!],
      userPreferences: preferences,
      connected: initiallySynced,
    });
    act(() => {
      realtime.provider.isSynced = true;
      realtime.provider.emit("synced", { state: true });
    });
    expect(screen.getByText("connected")).toBeTruthy();
    expect(client.refresh).toHaveBeenCalledTimes(initiallySynced ? 1 : 0);
    act(() => realtime.provider.emit("synced", { state: true }));
    expect(client.refresh).toHaveBeenCalledTimes(initiallySynced ? 2 : 1);
    act(() => addArtifactLog(realtime.provider.document, serviceArtifacts[1]!));
    expect(
      realtime.dashboard.mock.calls
        .at(-1)![0]
        .artifacts.map((artifact: any) => artifact.id),
    ).toEqual([serviceArtifacts[0]!.id, serviceArtifacts[1]!.id]);
    act(() => realtime.provider.emit("status", { status: "disconnected" }));
    expect(screen.getByText("disconnected")).toBeTruthy();
    unmount();
    expect(realtime.provider.listenerCount("synced")).toBe(0);
  },
);
