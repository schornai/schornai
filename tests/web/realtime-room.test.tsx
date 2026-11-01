// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Activity, StrictMode, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import WebSocket from "ws";
import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { RealtimeProvider } from "../../apps/web/lib/RealtimeProvider";
import { RealtimeRoom } from "../../apps/web/lib/RealtimeRoom";
import { waitForProviderSynced } from "../../packages/realtime/src/_lib/waitForProviderSynced";

afterEach(cleanup);

it.each([false, true])(
  "continues publishing edits after a cached chat is shown again (StrictMode: %s)",
  async (strict) => {
    const websocket = new HocuspocusProviderWebsocket({
      url: "ws://realtime.test",
      autoConnect: false,
    });
    let provider: HocuspocusProvider | undefined;
    function Chat() {
      provider = useHocuspocusProvider();
      const [draft, setDraft] = useState("");
      return (
        <input
          aria-label="draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      );
    }
    const tree = (mode: "visible" | "hidden") => (
      <RealtimeProvider websocketProvider={websocket}>
        <Activity mode={mode}>
          <RealtimeRoom name="chat" token="todo">
            <Chat />
          </RealtimeRoom>
        </Activity>
      </RealtimeProvider>
    );
    try {
      const renderTree = (mode: "visible" | "hidden") =>
        strict ? <StrictMode>{tree(mode)}</StrictMode> : tree(mode);
      const view = render(renderTree("visible"));
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "unsent draft" },
      });
      const firstProvider = provider!;
      provider!.document.getArray("messages").push(["first"]);
      expect(provider!.hasUnsyncedChanges).toBe(true);
      provider!.decrementUnsyncedChanges();
      expect(provider!.hasUnsyncedChanges).toBe(false);
      view.rerender(renderTree("hidden"));
      await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
      view.rerender(renderTree("visible"));
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
        "unsent draft",
      );
      expect(provider).not.toBe(firstProvider);
      expect(firstProvider.isAttached).toBe(false);
      expect(provider!.document).toBe(firstProvider.document);
      provider!.document.getArray("messages").push(["second"]);
      expect(provider!.hasUnsyncedChanges).toBe(true);
      expect(provider!.document.getArray("messages").toArray()).toEqual([
        "first",
        "second",
      ]);
    } finally {
      cleanup();
      await new Promise((resolve) => setTimeout(resolve, 10));
      provider?.document.destroy();
      websocket.destroy();
    }
  },
);

it("persists a second message after restoring the chat and reloading the server", async () => {
  const stored = new Map<string, Uint8Array>();
  const createServer = () =>
    new Server({
      address: "127.0.0.1",
      port: 0,
      quiet: true,
      stopOnSignals: false,
      debounce: 0,
      extensions: [
        new Database({
          fetch: ({ documentName }) =>
            Promise.resolve(stored.get(documentName) ?? null),
          store: ({ documentName, state }) => {
            stored.set(documentName, state);
            return Promise.resolve();
          },
        }),
      ],
    });
  let server = createServer();
  let websocket: HocuspocusProviderWebsocket | undefined;
  let provider: HocuspocusProvider | undefined;
  function Chat() {
    provider = useHocuspocusProvider();
    return null;
  }
  const tree = (mode: "visible" | "hidden") => (
    <RealtimeProvider websocketProvider={websocket!}>
      <Activity mode={mode}>
        <RealtimeRoom name="chat" token="todo">
          <Chat />
        </RealtimeRoom>
      </Activity>
    </RealtimeProvider>
  );
  const connect = () =>
    new HocuspocusProviderWebsocket({
      url: server.webSocketURL,
      WebSocketPolyfill: WebSocket,
    });
  const sync = () =>
    waitForProviderSynced(provider!, {
      abortSignal: AbortSignal.timeout(5_000),
    });
  try {
    await server.listen();
    websocket = connect();
    const view = render(tree("visible"));
    await sync();
    provider!.document.getArray("messages").push(["first"]);
    await sync();
    view.rerender(tree("hidden"));
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    view.rerender(tree("visible"));
    await sync();
    // Wait for the state exchange to finish so it cannot accidentally carry
    // the next edit and mask a missing document update listener.
    await act(() => new Promise((resolve) => setTimeout(resolve, 150)));
    provider!.document.getArray("messages").push(["second"]);
    await sync();
    await vi.waitFor(() => {
      expect(
        server.hocuspocus.documents.get("chat")!.getArray("messages").toArray(),
      ).toEqual(["first", "second"]);
    });
    view.unmount();
    provider!.document.destroy();
    websocket.destroy();
    await server.destroy();
    expect(stored.has("chat")).toBe(true);

    server = createServer();
    await server.listen();
    websocket = connect();
    render(tree("visible"));
    await sync();
    expect(provider!.document.getArray("messages").toArray()).toEqual([
      "first",
      "second",
    ]);
  } finally {
    cleanup();
    provider?.document.destroy();
    websocket?.destroy();
    await server.destroy();
  }
});
