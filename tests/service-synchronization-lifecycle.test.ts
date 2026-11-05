import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
import {
  startSynchronization,
  sharingRealtimeUrl,
  SyncQueue,
} from "../packages/service/src/synchronization.ts";
import { configSchema, type Context } from "../packages/service/src/config.ts";
import { syncArtifacts } from "../packages/service/src/artifacts.ts";
import { addArtifactLog } from "../packages/realtime/src/documents/artifactCatalog/_utils.ts";

const transport = vi.hoisted(() => ({
  providers: [] as any[],
  sockets: [] as any[],
}));
vi.mock("../packages/service/src/artifacts.ts", () => ({
  syncArtifacts: vi.fn(),
}));
vi.mock("@hocuspocus/provider", () => ({
  HocuspocusProviderWebsocket: class {
    status = "connected";
    destroy = vi.fn();
    constructor(public configuration: any) {
      transport.sockets.push(this);
    }
  },
  HocuspocusProvider: class extends EventEmitter {
    isSynced = false;
    attach = vi.fn();
    destroy = vi.fn();
    sendStateless = vi.fn();
    constructor(public configuration: any) {
      super();
      transport.providers.push(this);
    }
  },
}));

const context = (): Context => ({
  config: configSchema.parse({
    version: 1,
    id: "00000000-0000-4000-8000-000000000001",
    services: [],
    sharing: { url: "https://sharing.test" },
  }),
  configPath: "/test/config.json",
  root: "/test",
  environment: {
    SERVICE_API_TOKEN: "test-only-token-that-is-at-least-32-characters",
  },
});
const tick = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  transport.providers = [];
  transport.sockets = [];
  vi.mocked(syncArtifacts).mockResolvedValue({ failed: 0 } as any);
});

it("skips unconfigured sharing and rejects absent, short or whitespace credentials before opening a connection", () => {
  const current = context();
  delete current.config.sharing;
  expect(
    startSynchronization(
      current,
      vi.fn(),
      new AbortController().signal,
      {},
      vi.fn(),
    ),
  ).toBeUndefined();
  expect(() => sharingRealtimeUrl(current)).toThrow(
    "Sharing is not configured",
  );
  current.config = context().config;
  for (const token of [undefined, "short", "a".repeat(32) + " "]) {
    current.environment.SERVICE_API_TOKEN = token;
    expect(() =>
      startSynchronization(
        current,
        vi.fn(),
        new AbortController().signal,
        {},
        vi.fn(),
      ),
    ).toThrow("at least 32 non-whitespace");
  }
  expect(transport.sockets).toEqual([]);
});

it("uses explicit realtime endpoints and local configured ports", () => {
  const current = context();
  current.config.services = ["core"];
  current.config.sharing!.url = "http://127.0.0.1:3001";
  current.environment.SERVICE_REALTIME_PORT = "9123";
  expect(sharingRealtimeUrl(current)).toBe("ws://127.0.0.1:9123/");
  current.config.endpoints.realtime = "https://socket.test/custom";
  expect(sharingRealtimeUrl(current)).toBe("wss://socket.test/custom");
});

it("syncs initial/catalog/manual changes and publishes status only while connected, without overlapping samples", async () => {
  const controller = new AbortController();
  const log = vi.fn();
  const gate = Promise.withResolvers<any>();
  const report = vi
    .fn()
    .mockReturnValueOnce(gate.promise)
    .mockResolvedValue({ id: "machine", state: "running" });
  const current = context();
  const instance = startSynchronization(
    current,
    log,
    controller.signal,
    {},
    report,
  )!;
  const [catalog, status] = transport.providers;
  const socket = transport.sockets[0];
  try {
    await tick();
    expect(syncArtifacts).toHaveBeenCalledTimes(1);
    expect(catalog.configuration.token).toBe(
      `Service ${current.config.id} ${current.environment.SERVICE_API_TOKEN}`,
    );
    expect(
      transport.providers.every(
        (provider) => provider.attach.mock.calls.length === 1,
      ),
    ).toBe(true);
    catalog.configuration.onSynced({ state: false });
    await tick();
    expect(syncArtifacts).toHaveBeenCalledTimes(1);
    catalog.configuration.onSynced({ state: true });
    await tick();
    addArtifactLog(catalog.configuration.document, {
      id: "a".repeat(64),
      name: "test.tar",
      size: 1,
      createdAt: new Date().toISOString(),
      xrag: { xrag_version: 1, xrag_type: "setup" },
    });
    await tick();
    instance.request();
    await tick();
    expect(syncArtifacts).toHaveBeenCalledTimes(4);
    catalog.configuration.onAuthenticationFailed();
    expect(log).toHaveBeenCalledWith(
      "xrag",
      "Realtime authentication failed",
      "stderr",
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(report).not.toHaveBeenCalled();
    status.isSynced = true;
    socket.status = "disconnected";
    status.emit("synced");
    expect(report).not.toHaveBeenCalled();
    socket.status = "connected";
    status.emit("synced");
    status.emit("synced");
    expect(report).toHaveBeenCalledTimes(1);
    socket.status = "disconnected";
    gate.resolve({ id: "stale" });
    await tick();
    expect(status.sendStateless).not.toHaveBeenCalled();
    socket.status = "connected";
    await vi.advanceTimersByTimeAsync(10_000);
    expect(JSON.parse(status.sendStateless.mock.calls[0][0])).toMatchObject({
      id: "machine",
      state: "running",
      sync: { state: "idle" },
    });
    report.mockRejectedValueOnce(new Error("sampling denied"));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(log).toHaveBeenCalledWith(
      "metrics",
      "Error: sampling denied",
      "stderr",
    );
    controller.abort();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(report).toHaveBeenCalledTimes(3);
  } finally {
    controller.abort();
    await instance.stop();
  }
  expect(JSON.parse(status.sendStateless.mock.calls.at(-1)[0])).toMatchObject({
    state: "stopping",
  });
  expect(catalog.destroy).toHaveBeenCalledOnce();
  expect(status.destroy).toHaveBeenCalledOnce();
  expect(socket.destroy).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(["aborted", "disconnected", "failed-final-sample"])(
  "disposes providers when stopping with %s",
  async (mode) => {
    const controller = new AbortController();
    const gate = Promise.withResolvers<any>();
    const report = vi
      .fn()
      .mockReturnValueOnce(gate.promise)
      .mockRejectedValue(new Error("unavailable"));
    const instance = startSynchronization(
      context(),
      vi.fn(),
      controller.signal,
      {},
      report,
    )!;
    const status = transport.providers[1];
    status.isSynced = true;
    status.emit("synced");
    if (mode === "disconnected") transport.sockets[0].status = "disconnected";
    controller.abort();
    gate.resolve({ id: "late" });
    await instance.stop();
    expect(status.sendStateless).not.toHaveBeenCalled();
    expect(transport.sockets[0].destroy).toHaveBeenCalledOnce();
  },
);

it("retries failed installations with backoff and stops retrying when aborted", async () => {
  const controller = new AbortController();
  const sync = vi.fn().mockResolvedValue({ failed: 2 });
  const log = vi.fn();
  const queue = new SyncQueue(sync, controller.signal, log);
  queue.request();
  await tick();
  expect(queue.state.state).toBe("error");
  expect(log).toHaveBeenCalledWith(
    "xrag",
    expect.stringContaining("2 artifact installation(s) failed"),
    "stderr",
  );
  await vi.advanceTimersByTimeAsync(1000);
  expect(sync).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1999);
  expect(sync).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(sync).toHaveBeenCalledTimes(3);
  controller.abort();
  queue.request();
  await queue.stop();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(sync).toHaveBeenCalledTimes(3);
});

it("does not schedule retries after an active installation fails during shutdown", async () => {
  const controller = new AbortController();
  const gate = Promise.withResolvers<any>();
  const queue = new SyncQueue(() => gate.promise, controller.signal, vi.fn());
  queue.request();
  controller.abort();
  gate.reject(new Error("cancelled"));
  await queue.stop();
  expect(vi.getTimerCount()).toBe(0);
});
