// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Activity, StrictMode, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import WebSocket from "ws";
import { RealtimeProvider } from "../../apps/web/lib/RealtimeProvider";
import { RealtimeRoom } from "../../apps/web/lib/RealtimeRoom";
import { waitForProviderSynced } from "../../packages/realtime/src/_lib/waitForProviderSynced";

let server: Server;
const providers = new Map<string, HocuspocusProvider>();
const tokens: string[] = [];

beforeEach(async () => {
  vi.stubGlobal("WebSocket", WebSocket);
  providers.clear();
  tokens.length = 0;
  const stored = new Map<string, Uint8Array>();
  server = new Server({
    address: "127.0.0.1",
    port: 0,
    quiet: true,
    stopOnSignals: false,
    debounce: 0,
    onAuthenticate: async ({ token }) => {
      tokens.push(token);
    },
    extensions: [
      new Database({
        fetch: async ({ documentName }) => stored.get(documentName) ?? null,
        store: async ({ documentName, state }) => {
          stored.set(documentName, state);
        },
      }),
    ],
  });
  await server.listen();
});

afterEach(async () => {
  cleanup();
  await server.destroy();
  for (const provider of providers.values()) provider.document.destroy();
  vi.unstubAllGlobals();
});

function Probe({ id }: { id: string }) {
  providers.set(id, useHocuspocusProvider());
  const [draft, setDraft] = useState("");
  return (
    <input
      aria-label={id}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}

const provider = (id = "chat") => providers.get(id)!;
const sync = (id = "chat") =>
  waitForProviderSynced(provider(id), {
    abortSignal: AbortSignal.timeout(3000),
  });
const settle = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 100)));
const contents = (id = "chat") =>
  provider(id).document.getArray<string>("messages").toArray();
const add = (message: string, id = "chat") =>
  provider(id).document.getArray<string>("messages").push([message]);

it.each(["room", "layout"])(
  "restores a hidden %s repeatedly, including edits made while hidden and component state",
  async (boundary) => {
    const tree = (mode: "visible" | "hidden") => (
      <StrictMode>
        <Activity mode={boundary === "layout" ? mode : "visible"}>
          <RealtimeProvider url={server.webSocketURL}>
            <Activity mode={boundary === "room" ? mode : "visible"}>
              <RealtimeRoom name="chat" token="todo">
                <Probe id="chat" />
              </RealtimeRoom>
            </Activity>
          </RealtimeProvider>
        </Activity>
      </StrictMode>
    );
    const view = render(tree("visible"));
    await sync();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "draft survives" },
    });
    const document = provider().document;
    add("first");
    await sync();

    for (let cycle = 0; cycle < 3; cycle++) {
      const previousSocket = provider().configuration.websocketProvider;
      const destroyed = vi.fn();
      previousSocket.on("destroy", destroyed);
      view.rerender(tree("hidden"));
      await settle();
      expect(destroyed).toHaveBeenCalledOnce();
      document.getArray("messages").push([`hidden-${cycle}`]);
      view.rerender(tree("visible"));
      await sync();
      await settle();
      expect(provider().document).toBe(document);
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
        "draft survives",
      );
      add(`visible-${cycle}`);
      await sync();
      expect(
        server.hocuspocus.documents.get("chat")!.getArray("messages").toArray(),
      ).toEqual(contents());
    }
    const expected = contents();
    view.unmount();
    await settle();
    render(tree("visible"));
    await sync();
    expect(contents()).toEqual(expected);
  },
);

it("keeps overlapping rooms for the same document working when one room disappears", async () => {
  const tree = (mode: "visible" | "hidden") => (
    <RealtimeProvider url={server.webSocketURL}>
      <RealtimeRoom name="activities" token="todo">
        <Probe id="sidebar" />
      </RealtimeRoom>
      <Activity mode={mode}>
        <RealtimeRoom name="activities" token="todo">
          <Probe id="page" />
        </RealtimeRoom>
      </Activity>
    </RealtimeProvider>
  );
  const view = render(tree("visible"));
  await Promise.all([sync("sidebar"), sync("page")]);
  const socket = provider("sidebar").configuration.websocketProvider;
  const destroyed = vi.fn();
  socket.on("destroy", destroyed);
  expect(provider("page").configuration.websocketProvider).toBe(socket);
  expect(socket.configuration.providerMap.size).toBe(2);
  add("first", "page");
  await sync("page");
  await vi.waitFor(() => expect(contents("sidebar")).toEqual(["first"]));

  view.rerender(tree("hidden"));
  await settle();
  expect(destroyed).not.toHaveBeenCalled();
  expect(socket.configuration.providerMap.size).toBe(1);
  add("second", "sidebar");
  await sync("sidebar");
  view.rerender(tree("visible"));
  await sync("page");
  await settle();
  expect(contents("page")).toEqual(["first", "second"]);
  add("third", "page");
  await sync("page");
  await vi.waitFor(() =>
    expect(contents("sidebar")).toEqual(["first", "second", "third"]),
  );
  expect(socket.configuration.providerMap.size).toBe(2);
  view.unmount();
  await settle();
  expect(destroyed).toHaveBeenCalledOnce();
  expect(socket.configuration.providerMap.size).toBe(0);
});

it("isolates document changes and reauthenticates a changed token without losing document data", async () => {
  const tree = (name: string, token: string) => (
    <RealtimeProvider url={server.webSocketURL}>
      <RealtimeRoom name={name} token={token}>
        <Probe id="chat" />
      </RealtimeRoom>
    </RealtimeProvider>
  );
  const view = render(tree("first", "token-one"));
  await sync();
  add("first document");
  await sync();
  view.rerender(tree("second", "token-two"));
  await sync();
  expect(contents()).toEqual([]);
  const document = provider().document;
  add("second document");
  await sync();
  view.rerender(tree("second", "token-three"));
  await sync();
  await settle();
  expect(provider().document).toBe(document);
  add("after token change");
  await sync();
  expect(contents()).toEqual(["second document", "after token change"]);
  expect(tokens).toEqual(["token-one", "token-two", "token-three"]);
});

it("releases its rooms without destroying a borrowed websocket", async () => {
  const socket = new HocuspocusProviderWebsocket({ url: server.webSocketURL });
  const destroy = vi.spyOn(socket, "destroy");
  try {
    const view = render(
      <RealtimeProvider websocketProvider={socket}>
        <RealtimeRoom name="borrowed" token="todo">
          <Probe id="chat" />
        </RealtimeRoom>
      </RealtimeProvider>,
    );
    await sync();
    view.unmount();
    expect(destroy).not.toHaveBeenCalled();
    expect(socket.configuration.providerMap.size).toBe(0);
  } finally {
    socket.destroy();
  }
});

it("authenticates rooms with the current Supabase session and renews the credential", async () => {
  const setToken = (access_token: string) => {
    document.cookie = `aibox-auth-token=${encodeURIComponent(JSON.stringify({ access_token }))}; path=/`;
  };
  setToken("session-one");
  try {
    render(
      <RealtimeProvider url={server.webSocketURL}>
        <RealtimeRoom name="chat">
          <Probe id="chat" />
        </RealtimeRoom>
      </RealtimeProvider>,
    );
    await sync();
    add("retained draft");
    await sync();
    act(() => {
      setToken("session-two");
      window.dispatchEvent(new Event("focus"));
    });
    await sync();
    await settle();
    expect(tokens).toEqual(["User session-one", "User session-two"]);
    expect(contents()).toEqual(["retained draft"]);
  } finally {
    document.cookie = "aibox-auth-token=; max-age=0; path=/";
  }
});
