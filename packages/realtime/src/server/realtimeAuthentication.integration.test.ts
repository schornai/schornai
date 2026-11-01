import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import { Server } from "@hocuspocus/server";
import { Doc } from "yjs";
import { expect, it, vi } from "vitest";
import { createRealtimeAuthentication } from "./createRealtimeAuthentication.ts";
import { waitForProviderSynced } from "../_lib/waitForProviderSynced.ts";

it("authenticates each real websocket room and rejects forged writes to read-only documents", async () => {
  const secret = "integration-only-server-secret-0123456789";
  const authorizeUser = vi.fn(async (token: string, name: string) =>
    token === "valid-user" && name === "activity___own"
      ? { permission: "read" as const, expiresAt: Date.now() + 60_000 }
      : undefined,
  );
  let onReaderMessage: (() => void) | undefined;
  const server = new Server({
    address: "127.0.0.1",
    port: 0,
    quiet: true,
    stopOnSignals: false,
    extensions: [createRealtimeAuthentication({ secret, authorizeUser })],
    async afterHandleMessage({ context }) {
      if (context.authorization?.token === "User valid-user")
        onReaderMessage?.();
    },
  });
  const providers: HocuspocusProvider[] = [];
  const sockets: HocuspocusProviderWebsocket[] = [];
  const docs: Doc[] = [];
  const connect = (
    token: string,
    name: string,
    onAuthenticationFailed?: () => void,
  ) => {
    const websocketProvider = new HocuspocusProviderWebsocket({
      url: server.webSocketURL,
    });
    sockets.push(websocketProvider);
    const document = new Doc();
    docs.push(document);
    const provider = new HocuspocusProvider({
      name,
      token,
      document,
      websocketProvider,
      sessionAwareness: true,
      onAuthenticationFailed,
    });
    providers.push(provider);
    provider.attach();
    return provider;
  };
  try {
    await server.listen();
    const denied = Promise.withResolvers<void>();
    connect("Worker DANGER_UNSAFE_TODO_REPLACE", "taskQueue", denied.resolve);
    await denied.promise;
    expect(server.hocuspocus.documents.has("taskQueue")).toBe(false);

    const worker = connect(`Worker ${secret}`, "activity___own");
    await waitForProviderSynced(worker, {
      abortSignal: AbortSignal.timeout(5_000),
    }).catch((error) => {
      throw new Error("worker sync", { cause: error });
    });
    worker.document.getMap("state").set("value", "server-value");
    await waitForProviderSynced(worker, {
      abortSignal: AbortSignal.timeout(5_000),
    }).catch((error) => {
      throw new Error("worker sync", { cause: error });
    });
    const reader = connect("User valid-user", "activity___own");
    await waitForProviderSynced(reader, {
      abortSignal: AbortSignal.timeout(5_000),
    }).catch((error) => {
      throw new Error("reader sync", { cause: error });
    });
    expect(reader.document.getMap("state").get("value")).toBe("server-value");
    expect(reader.authorizedScope).toBe("readonly");

    // Tamper with a local CRDT; the server must enforce read-only itself.
    const handled = Promise.withResolvers<void>();
    onReaderMessage = handled.resolve;
    reader.document.getMap("state").set("value", "forged");
    await handled.promise;
    expect(
      server.hocuspocus.documents
        .get("activity___own")!
        .getMap("state")
        .get("value"),
    ).toBe("server-value");

    const forbidden = Promise.withResolvers<void>();
    connect("User valid-user", "activity___other", forbidden.resolve);
    await forbidden.promise;
    expect(server.hocuspocus.documents.has("activity___other")).toBe(false);
  } finally {
    for (const provider of providers) provider.destroy();
    for (const socket of sockets) socket.destroy();
    for (const doc of docs) doc.destroy();
    await server.destroy();
  }
});
