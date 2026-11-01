import { it, expect, vi } from "vitest";
import { Server } from "@hocuspocus/server";
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import { createServer } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Doc } from "yjs";
import { createRealtimeAuthentication } from "../packages/realtime/src/server/createRealtimeAuthentication.ts";
import { createServiceStatusExtension } from "../packages/realtime/src/server/createServiceStatusExtension.ts";
import { getMachines } from "../packages/realtime/src/documents/services/_schema.ts";
import { addArtifactLog } from "../packages/realtime/src/documents/artifactCatalog/_utils.ts";
import { waitForProviderSynced } from "../packages/realtime/src/_lib/waitForProviderSynced.ts";
import { SyncQueue } from "../packages/service/src/synchronization.ts";
import { control } from "../packages/service/src/control.ts";
import { parseAppleGpu } from "../packages/service/src/metrics.ts";

it("serializes notifications and manual requests, retries failures, and stays idle after success", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const gate = Promise.withResolvers<{ failed: number }>();
  const sync = vi
    .fn()
    .mockReturnValueOnce(gate.promise)
    .mockResolvedValue({ failed: 0 });
  const queue = new SyncQueue(sync, controller.signal, vi.fn());
  try {
    queue.request();
    queue.request();
    queue.request();
    expect(sync).toHaveBeenCalledTimes(1);
    gate.resolve({ failed: 0 });
    await vi.advanceTimersByTimeAsync(0);
    expect(sync).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(sync).toHaveBeenCalledTimes(2);
    sync.mockRejectedValueOnce(new Error("offline"));
    queue.request();
    await vi.advanceTimersByTimeAsync(1000);
    expect(sync).toHaveBeenCalledTimes(4);
    expect(queue.state.state).toBe("idle");
  } finally {
    controller.abort();
    await queue.stop();
    vi.useRealTimers();
  }
});
it("reads Apple GPU utilization without inventing unsupported values", () => {
  expect(
    parseAppleGpu('"PerformanceStatistics" = {"Device Utilization %"=43}'),
  ).toEqual([{ name: "Apple GPU", utilizationPercent: 43 }]);
  expect(parseAppleGpu("no performance counters")).toEqual([]);
});
it("a real CLI daemon reacts to Yjs changes, manual sync and reconnect, and reports status without polling", async () => {
  const secret = "test-worker-credential-0123456789012345";
  const token = "test-service-credential-012345678901";
  const id = "00000000-0000-4000-8000-000000000001";
  const root = await mkdtemp(join(tmpdir(), "service-live-sync-"));
  let reads = 0;
  const http = createServer((req, res) => {
    expect(req.headers.authorization).toBe(`Bearer ${token}`);
    reads++;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ artifacts: [], nextOffset: null }));
  });
  const server = new Server({
    address: "127.0.0.1",
    port: 0,
    quiet: true,
    stopOnSignals: false,
    extensions: [
      createRealtimeAuthentication({
        secret,
        serviceSecret: token,
        authorizeUser: async () => undefined,
      }),
      createServiceStatusExtension(),
    ],
  });
  let provider: HocuspocusProvider | undefined;
  let socket: HocuspocusProviderWebsocket | undefined;
  const doc = new Doc();
  const cli = join(process.cwd(), "packages/service/src/main.ts");
  const configPath = join(root, "config.json");
  const run = (...args: string[]) =>
    promisify(execFile)(process.execPath, [
      cli,
      "service",
      ...args,
      "--config",
      configPath,
    ]);
  try {
    await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
    await server.listen();
    const port = (http.address() as { port: number }).port;
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        id,
        services: [],
        sharing: { url: `http://127.0.0.1:${port}` },
        endpoints: { realtime: server.webSocketURL.replace("ws:", "http:") },
      }),
    );
    await writeFile(join(root, "docker.env"), `SERVICE_API_TOKEN=${token}\n`);
    await run("start");
    await vi.waitFor(
      () =>
        expect(
          getMachines(server.hocuspocus.documents.get("services")!).get(id)
            ?.name,
        ).toBeTruthy(),
      { timeout: 8000 },
    );
    const machine = getMachines(
      server.hocuspocus.documents.get("services")!,
    ).get(id)!;
    expect(machine.roles).toEqual([]);
    expect(machine.metrics.memory.total).toBeGreaterThan(0);
    await vi.waitFor(() => expect(reads).toBeGreaterThan(0));
    await new Promise((resolve) => setTimeout(resolve, 150));
    const initial = reads;
    await new Promise((resolve) => setTimeout(resolve, 5500));
    expect(reads).toBe(initial);
    expect(JSON.parse((await run("sync", "--json")).stdout).sync).toBe(
      "queued",
    );
    await vi.waitFor(() => expect(reads).toBeGreaterThan(initial));
    socket = new HocuspocusProviderWebsocket({ url: server.webSocketURL });
    provider = new HocuspocusProvider({
      name: "artifactCatalog",
      token: `Worker ${secret}`,
      document: doc,
      websocketProvider: socket,
    });
    provider.attach();
    await waitForProviderSynced(provider, {
      abortSignal: AbortSignal.timeout(5000),
    });
    const beforeChange = reads;
    addArtifactLog(doc, {
      id: "a".repeat(64),
      name: "test.tar",
      size: 1,
      createdAt: new Date().toISOString(),
      xrag: {
        xrag_version: 1,
        xrag_type: "files",
        targets: ["future"],
        name: "test",
      },
    });
    await vi.waitFor(() => expect(reads).toBeGreaterThan(beforeChange));
    const beforeReconnect = reads;
    for (const document of server.hocuspocus.documents.values()) {
      for (const connection of document.getConnections()) {
        if (connection.context.authorization?.serviceId === id)
          connection.webSocket.close(1012, "test reconnect");
      }
    }
    await vi.waitFor(() => expect(reads).toBeGreaterThan(beforeReconnect), {
      timeout: 8000,
    });
    await run("stop");
    expect((await run("status", "--json")).stdout).toContain("stopped");
    await expect(run("sync")).rejects.toThrow("Service is not running");
  } finally {
    await control(root, "stop").catch(() => {});
    provider?.destroy();
    socket?.destroy();
    doc.destroy();
    await server.destroy();
    await new Promise<void>((resolve) => http.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

it("uses the loopback realtime port for migrated local web hosts and the public endpoint for remote machines", async () => {
  const { sharingRealtimeUrl } =
    await import("../packages/service/src/synchronization.ts");
  const { configSchema } = await import("../packages/service/src/config.ts");
  const context = {
    root: "/tmp/test",
    configPath: "/tmp/test/config.json",
    environment: {},
    config: configSchema.parse({
      version: 1,
      id: "00000000-0000-4000-8000-000000000001",
      services: ["core"],
      sharing: { url: "http://127.0.0.1:3001" },
    }),
  };
  expect(sharingRealtimeUrl(context)).toBe("ws://127.0.0.1:9001/");
  context.config.development = { workspace: "/tmp/workspace" };
  expect(sharingRealtimeUrl(context)).toBe("ws://127.0.0.1:9000/");
  context.config.services = ["transcriber-mlx"];
  context.config.sharing!.url = "https://box.example";
  expect(sharingRealtimeUrl(context)).toBe("wss://box.example/v2/realtime");
});
