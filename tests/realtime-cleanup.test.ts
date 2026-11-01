import { EventEmitter } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ServerBatchRealtimeProvider,
  ServerRealtimeProvider,
} from "../packages/realtime/src/server/ServerRealtimeProvider";
const state = vi.hoisted(() => ({ providers: [] as any[] }));
vi.mock("@hocuspocus/provider", () => ({
  HocuspocusProvider: class extends EventEmitter {
    isSynced = false;
    hasUnsyncedChanges = true;
    attach = vi.fn();
    destroy = vi.fn(() => this.emit("destroy"));
    constructor() {
      super();
      state.providers.push(this);
    }
  },
}));
beforeEach(() => {
  state.providers = [];
});
afterEach(() => vi.restoreAllMocks());
const config = {
  serverToken: "Worker tests",
  websocketProvider: { websocketProvider: {} },
} as any;
it.each([false, true])(
  "disposes an unsynchronized provider after its deadline (initially synced: %s)",
  async (synced) => {
    const controller = new AbortController();
    const provider = new ServerRealtimeProvider({
      ...config,
      documentName: "taskQueue",
      disposalAbortSignal: controller.signal,
    });
    state.providers[0].isSynced = synced;
    const destroy = vi.spyOn(provider.document, "destroy");
    const disposing = provider[Symbol.asyncDispose]();
    const rejected = expect(disposing).rejects.toMatchObject({
      name: "TimeoutError",
    });
    controller.abort(new DOMException("deadline", "TimeoutError"));
    await rejected;
    expect(state.providers[0].destroy).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(state.providers[0].eventNames()).toEqual([]);
  },
);
it("destroys every batch provider even when the deadline has already expired", async () => {
  const batch = new ServerBatchRealtimeProvider({
    ...config,
    documentNames: ["one", "two"],
    disposalAbortSignal: AbortSignal.abort(),
  });
  const destroyed = batch.documents.map((doc) => vi.spyOn(doc, "destroy"));
  await expect(batch[Symbol.asyncDispose]()).rejects.toBeInstanceOf(
    AggregateError,
  );
  for (const provider of state.providers)
    expect(provider.destroy).toHaveBeenCalledOnce();
  for (const destroy of destroyed) expect(destroy).toHaveBeenCalledOnce();
});
it("also bounds disposal when the caller did not supply a deadline", async () => {
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(AbortSignal.abort());
  const provider = new ServerRealtimeProvider({
    ...config,
    documentName: "taskQueue",
  });
  await expect(provider[Symbol.asyncDispose]()).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(timeout).toHaveBeenCalledWith(30_000);
  expect(state.providers[0].destroy).toHaveBeenCalledOnce();
});
