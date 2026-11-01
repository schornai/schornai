import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import { Doc } from "yjs";
import {
  artifactCatalogDocumentName,
  getArtifactLog,
} from "@schornio/aibox-realtime/documents/artifactCatalog/_utils";
import {
  servicesDocumentName,
  type MachineReport,
} from "@schornio/aibox-realtime/documents/services/_schema";
import type { Context } from "./config.ts";
import type { Log } from "./log.ts";
import { syncArtifacts } from "./artifacts.ts";

/** One serial consumer for reconnects, CRUD notifications and manual CLI sync. */
export class SyncQueue {
  state: MachineReport["sync"] = { state: "idle" };
  private pending = false;
  private active?: Promise<void>;
  private retry?: ReturnType<typeof setTimeout>;
  private retryMs = 1000;
  private sync: () => Promise<{ failed: number } | undefined>;
  private signal: AbortSignal;
  private log: Log;
  constructor(
    sync: () => Promise<{ failed: number } | undefined>,
    signal: AbortSignal,
    log: Log,
  ) {
    this.sync = sync;
    this.signal = signal;
    this.log = log;
  }
  request() {
    if (this.signal.aborted) return;
    clearTimeout(this.retry);
    this.pending = true;
    if (this.active) return;
    this.active = this.drain().finally(() => {
      this.active = undefined;
      if (this.pending && !this.signal.aborted) this.request();
    });
  }
  private async drain() {
    while (this.pending && !this.signal.aborted) {
      this.pending = false;
      this.state = { ...this.state, state: "syncing" };
      try {
        const result = await this.sync();
        if (result?.failed)
          throw new Error(`${result.failed} artifact installation(s) failed`);
        this.state = { state: "idle", lastSuccessAt: new Date().toISOString() };
        this.retryMs = 1000;
        this.log("xrag", "Synchronization completed");
      } catch (error) {
        this.state = { ...this.state, state: "error" };
        if (!this.signal.aborted) {
          this.log(
            "xrag",
            `Synchronization failed: ${String(error)}`,
            "stderr",
          );
          // Retry failed work only; there is no periodic catalog polling.
          this.retry = setTimeout(() => this.request(), this.retryMs);
          this.retryMs = Math.min(60_000, this.retryMs * 2);
        }
      }
    }
  }
  async stop() {
    clearTimeout(this.retry);
    await this.active;
    clearTimeout(this.retry);
  }
}

export function sharingRealtimeUrl(context: Context) {
  const sharing = context.config.sharing;
  if (!sharing) throw new Error("Sharing is not configured");
  const origin = new URL(sharing.url);
  const localWeb =
    context.config.services.includes("core") &&
    ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  const url = new URL(
    context.config.endpoints.realtime ??
      (localWeb
        ? `http://127.0.0.1:${context.config.development ? "9000" : (context.environment.SERVICE_REALTIME_PORT ?? "9001")}`
        : `${sharing.url.replace(/\/$/, "")}/v2/realtime`),
  );
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function startSynchronization(
  context: Context,
  log: Log,
  signal: AbortSignal,
  hooks: Parameters<typeof syncArtifacts>[3],
  report: () => Promise<Omit<MachineReport, "sync">>,
) {
  const sharing = context.config.sharing;
  if (!sharing) return undefined;
  const token = context.environment[sharing.tokenEnv];
  if (!token || token.length < 32 || /\s/.test(token))
    throw new Error(
      "Sharing requires a SERVICE_API_TOKEN of at least 32 non-whitespace characters",
    );
  const websocket = new HocuspocusProviderWebsocket({
    url: sharingRealtimeUrl(context),
  });
  const queue = new SyncQueue(
    () => syncArtifacts(context, log, signal, hooks),
    signal,
    log,
  );
  const catalogDoc = new Doc();
  const statusDoc = new Doc();
  const auth = `Service ${context.config.id} ${token}`;
  const catalog = new HocuspocusProvider({
    name: artifactCatalogDocumentName,
    document: catalogDoc,
    websocketProvider: websocket,
    token: auth,
    onSynced: ({ state }) => {
      if (state) queue.request();
    },
    onAuthenticationFailed: () =>
      log("xrag", "Realtime authentication failed", "stderr"),
  });
  const status = new HocuspocusProvider({
    name: servicesDocumentName,
    document: statusDoc,
    websocketProvider: websocket,
    token: auth,
  });
  const changed = () => queue.request();
  getArtifactLog(catalogDoc).observe(changed);
  let sampling: Promise<void> | undefined;
  const sendStatus = () => {
    if (
      sampling ||
      signal.aborted ||
      !status.isSynced ||
      websocket.status !== "connected"
    )
      return;
    sampling = report()
      .then((value) => {
        if (!signal.aborted && websocket.status === "connected")
          status.sendStateless(JSON.stringify({ ...value, sync: queue.state }));
      })
      .catch((error) => log("metrics", String(error), "stderr"))
      .finally(() => {
        sampling = undefined;
      });
  };
  status.on("synced", sendStatus);
  const timer = setInterval(sendStatus, 10_000);
  catalog.attach();
  status.attach();
  // Initial snapshot also works while the websocket is still reconnecting.
  queue.request();
  return {
    request: () => queue.request(),
    async stop() {
      clearInterval(timer);
      getArtifactLog(catalogDoc).unobserve(changed);
      await queue.stop();
      await sampling;
      if (status.isSynced && websocket.status === "connected") {
        const last = await report().catch(() => undefined);
        if (last)
          status.sendStateless(
            JSON.stringify({ ...last, state: "stopping", sync: queue.state }),
          );
      }
      catalog.destroy();
      status.destroy();
      websocket.destroy();
      catalogDoc.destroy();
      statusDoc.destroy();
    },
  };
}
