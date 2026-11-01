import { beforeEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { createSupabaseClient } from "../packages/database/src/_util/createSupabaseClient";
import { ServerRealtimeWebsocketProvider } from "../packages/realtime/src/server/ServerRealtimeWebsocketProvider";
import {
  ServerBatchRealtimeProvider,
  ServerRealtimeProvider,
} from "../packages/realtime/src/server/ServerRealtimeProvider";
const sdk = vi.hoisted(() => ({
  client: vi.fn(() => ({ client: true })),
  sockets: [] as any[],
  providers: [] as any[],
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: sdk.client }));
vi.mock("@hocuspocus/provider", () => ({
  HocuspocusProviderWebsocket: class {
    constructor(config: any) {
      Object.assign(this, config);
      sdk.sockets.push(this);
    }
  },
  HocuspocusProvider: class extends EventEmitter {
    isSynced = true;
    hasUnsyncedChanges = false;
    attach = vi.fn();
    destroy = vi.fn();
    constructor(config: any) {
      super();
      Object.assign(this, config);
      sdk.providers.push(this);
    }
  },
}));
beforeEach(() => {
  sdk.client.mockClear();
  sdk.providers = [];
  sdk.sockets = [];
  ServerRealtimeWebsocketProvider.websocketProviders.clear();
});
it.each(["SUPABASE_URL", "SUPABASE_ANON_KEY"])(
  "requires the database environment setting %s",
  (key) => {
    vi.stubEnv(key, "");
    expect(() => createSupabaseClient()).toThrow(key);
  },
);
it("creates database clients with default and explicitly named environment keys", () => {
  createSupabaseClient();
  expect(sdk.client).toHaveBeenCalledWith(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
  );
  vi.stubEnv("DB_URL", "https://custom.supabase.test");
  vi.stubEnv("DB_KEY", "custom-key");
  createSupabaseClient({
    environmentKeys: { supabaseUrl: "DB_URL", supabaseKey: "DB_KEY" },
  });
  expect(sdk.client).toHaveBeenCalledWith(
    "https://custom.supabase.test",
    "custom-key",
  );
});
it("reuses websocket connections by URL and rejects missing URL configuration", () => {
  vi.stubEnv("SOCKET", "ws://custom.test");
  const first = new ServerRealtimeWebsocketProvider({
    environmentKeys: { serverUrl: "SOCKET" },
  });
  const next = new ServerRealtimeWebsocketProvider({
    environmentKeys: { serverUrl: "SOCKET" },
  });
  expect(first.websocketProvider).toBe(next.websocketProvider);
  expect(sdk.sockets).toHaveLength(1);
  new ServerRealtimeWebsocketProvider();
  expect(sdk.sockets).toHaveLength(2);
  vi.stubEnv("SOCKET", "");
  expect(
    () =>
      new ServerRealtimeWebsocketProvider({
        environmentKeys: { serverUrl: "SOCKET" },
      }),
  ).toThrow("SOCKET");
});
it("applies batch changes to every document, waits for synchronization and disposes all providers", async () => {
  const batch = new ServerBatchRealtimeProvider({
    documentNames: ["activities_user_a", "activities_user_b"] as any,
    serverToken: ServerRealtimeProvider.getServerToken("secret"),
    websocketProvider: { websocketProvider: {} } as any,
  });
  batch.batch(
    (doc, value: string) => doc.getMap("test").set("value", value),
    "updated",
  );
  expect(batch.documents.map((doc) => doc.getMap("test").get("value"))).toEqual(
    ["updated", "updated"],
  );
  expect(
    sdk.providers.every(
      (p) => p.token === "Worker secret" && p.attach.mock.calls.length === 1,
    ),
  ).toBe(true);
  await batch.waitForSynced();
  await batch[Symbol.asyncDispose]();
  expect(sdk.providers.every((p) => p.destroy.mock.calls.length === 1)).toBe(
    true,
  );
});
