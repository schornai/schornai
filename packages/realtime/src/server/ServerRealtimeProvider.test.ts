import { Database } from "@hocuspocus/extension-database";
import { EventEmitter } from "node:events";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { Server } from "@hocuspocus/server";
import { ServerRealtimeProvider } from "./ServerRealtimeProvider.ts";
import assert from "node:assert/strict";
import { getChatDocumentName } from "../documents/chat/_utils.ts";
import { test, vi } from "vitest";
import { waitForProviderSynced } from "../_lib/waitForProviderSynced.ts";

class TestProvider extends EventEmitter {
  isSynced = false;
  hasUnsyncedChanges = true;
}

test.each([undefined, new AbortController().signal])(
  "bounds synchronization even with a non-aborted caller signal (%s)",
  async (abortSignal) => {
    vi.useFakeTimers();
    try {
      const provider = new TestProvider();
      const waiting = waitForProviderSynced(
        provider as unknown as HocuspocusProvider,
        { abortSignal },
      );
      const rejected = assert.rejects(waiting, { name: "TimeoutError" });
      await vi.advanceTimersByTimeAsync(30_000);
      await rejected;
      assert.equal(provider.eventNames().length, 0);
      assert.equal(vi.getTimerCount(), 0);
    } finally {
      vi.useRealTimers();
    }
  },
);

test.each(["authenticationFailed", "close"])(
  "rejects synchronization on %s and removes listeners and timers",
  async (event) => {
    vi.useFakeTimers();
    try {
      const provider = new TestProvider();
      const waiting = waitForProviderSynced(
        provider as unknown as HocuspocusProvider,
      );
      provider.emit(event, { reason: "secret server details" });
      await assert.rejects(
        waiting,
        event === "close" ? /connection closed/ : /authentication failed/,
      );
      assert.equal(provider.eventNames().length, 0);
      assert.equal(vi.getTimerCount(), 0);
    } finally {
      vi.useRealTimers();
    }
  },
);

void test("initial synchronization also waits for outstanding acknowledgments", async () => {
  const provider = new TestProvider();
  let completed = false;
  const waiting = waitForProviderSynced(
    provider as unknown as HocuspocusProvider,
  ).then(() => {
    completed = true;
  });
  provider.isSynced = true;
  provider.emit("synced", { state: true });
  await Promise.resolve();
  assert.equal(completed, false);
  provider.hasUnsyncedChanges = false;
  provider.emit("unsyncedChanges", { number: 0 });
  await waiting;
  assert.equal(completed, true);
  assert.equal(provider.eventNames().length, 0);
});

void test("writes after the first handshake wait without another synced event", async () => {
  const provider = new TestProvider();
  provider.isSynced = true;
  let completed = false;
  const waiting = waitForProviderSynced(
    provider as unknown as HocuspocusProvider,
  ).then(() => {
    completed = true;
  });
  await Promise.resolve();
  assert.equal(completed, false);
  provider.hasUnsyncedChanges = false;
  provider.emit("unsyncedChanges", { number: 0 });
  await waiting;
  assert.equal(completed, true);
  assert.equal(provider.eventNames().length, 0);
});

void test("aborting synchronization removes listeners and preserves the abort reason", async () => {
  const provider = new TestProvider();
  const controller = new AbortController();
  const waiting = waitForProviderSynced(
    provider as unknown as HocuspocusProvider,
    {
      abortSignal: controller.signal,
    },
  );
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });
  assert.equal(provider.eventNames().length, 0);
});

void test("destroying a provider rejects synchronization and removes listeners", async () => {
  const provider = new TestProvider();
  const waiting = waitForProviderSynced(
    provider as unknown as HocuspocusProvider,
  );
  provider.emit("destroy");
  await assert.rejects(waiting, /destroyed before synchronization/);
  assert.equal(provider.eventNames().length, 0);
});

test("rejects denied authentication against a real server and releases the document", async () => {
  const server = new Server({
    address: "127.0.0.1",
    port: 0,
    quiet: true,
    stopOnSignals: false,
    onAuthenticate: async () => {
      throw new Error("Access denied");
    },
  });
  let websocket: HocuspocusProviderWebsocket | undefined;
  let provider: ServerRealtimeProvider | undefined;
  try {
    await server.listen();
    websocket = new HocuspocusProviderWebsocket({ url: server.webSocketURL });
    provider = new ServerRealtimeProvider({
      documentName: getChatDocumentName({
        activityId: "test",
        agentId: "test",
      }),
      serverToken: "Worker invalid",
      websocketProvider: { websocketProvider: websocket },
    });
    await assert.rejects(provider.waitForSynced(), /authentication failed/);
    await provider[Symbol.asyncDispose]();
    assert.equal(provider.document.isDestroyed, true);
    assert.equal(websocket.configuration.providerMap.size, 0);
  } finally {
    provider?.provider.destroy();
    provider?.document.destroy();
    websocket?.destroy();
    await server.destroy();
  }
});

void test("two chat messages survive provider disposal and a server reload", async () => {
  const stored = new Map<string, Uint8Array>();
  const createServer = () =>
    new Server({
      address: "127.0.0.1",
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
      port: 0,
      quiet: true,
      stopOnSignals: false,
    });
  const documentName = getChatDocumentName({
    activityId: "test",
    agentId: "test",
  });
  let server = createServer();
  let websocket: HocuspocusProviderWebsocket | undefined;
  let chat: ServerRealtimeProvider | undefined;
  try {
    await server.listen();
    websocket = new HocuspocusProviderWebsocket({ url: server.webSocketURL });
    chat = new ServerRealtimeProvider({
      documentName,
      serverToken: "Worker test",
      websocketProvider: { websocketProvider: websocket },
    });
    await chat.waitForSynced({ abortSignal: AbortSignal.timeout(5_000) });
    for (const text of ["first", "second"]) {
      chat.document.getArray<string>("messages").push([text]);
      assert.equal(chat.provider.hasUnsyncedChanges, true);
      await chat.waitForSynced({ abortSignal: AbortSignal.timeout(5_000) });
      assert.equal(chat.provider.hasUnsyncedChanges, false);
    }
    // Disposal must flush the final write even when the handshake is already complete.
    chat.document.getMap("state").set("type", "idle");
    await chat[Symbol.asyncDispose]();
    chat = undefined;
    websocket.destroy();
    await server.destroy();
    assert.ok(stored.has(documentName));

    server = createServer();
    await server.listen();
    websocket = new HocuspocusProviderWebsocket({ url: server.webSocketURL });
    chat = new ServerRealtimeProvider({
      documentName,
      serverToken: "Worker test",
      websocketProvider: { websocketProvider: websocket },
    });
    await chat.waitForSynced({ abortSignal: AbortSignal.timeout(5_000) });
    assert.deepEqual(chat.document.getArray("messages").toArray(), [
      "first",
      "second",
    ]);
    assert.equal(chat.document.getMap("state").get("type"), "idle");
  } finally {
    chat?.provider.destroy();
    chat?.document.destroy();
    websocket?.destroy();
    await server.destroy();
  }
});
