import { afterEach, expect, it, vi } from "vitest";
import { Server } from "@hocuspocus/server";
import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { Database } from "@hocuspocus/extension-database";
import { createRealtimeAuthentication } from "../packages/realtime/src/server/createRealtimeAuthentication";
import { createTaskCoordinatorExtension } from "../packages/realtime/src/server/createTaskCoordinatorExtension";
import { ServerRealtimeProvider } from "../packages/realtime/src/server/ServerRealtimeProvider";
import { TaskQueue } from "../packages/realtime/src/documents/taskQueue/TaskQueue";
import { getTaskQueueDocumentName } from "../packages/realtime/src/documents/taskQueue/_utils";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
import { requestTaskCoordinator } from "../packages/realtime/src/documents/taskQueue/requestTaskCoordinator";
import { decodeTaskValue } from "../packages/realtime/src/documents/taskQueue/_taskCodec";
import type { Task } from "../packages/realtime/src/documents/taskQueue/_types";
import { taskClaimStore } from "./helpers/task-claims";
const secret = "task-coordinator-test-secret-32-characters";
const token = `Worker ${secret}` as const;
const servers: Server[] = [];
const sockets: HocuspocusProviderWebsocket[] = [];
const providers: ServerRealtimeProvider[] = [];
const stops: AbortController[] = [];
afterEach(async () => {
  stops.splice(0).forEach((stop) => stop.abort());
  providers.splice(0).forEach((p) => {
    p.provider.destroy();
    p.document.destroy();
  });
  sockets.splice(0).forEach((socket) => socket.destroy());
  for (const server of servers.splice(0)) await server.destroy();
});
async function start(
  store: ReturnType<typeof taskClaimStore>,
  persisted = new Map<string, Uint8Array>(),
) {
  const server = new Server({
    address: "127.0.0.1",
    port: 0,
    quiet: true,
    stopOnSignals: false,
    debounce: 0,
    extensions: [
      createRealtimeAuthentication({
        secret,
        authorizeUser: async () => ({
          permission: "read_write",
          expiresAt: Date.now() + 60_000,
        }),
      }),
      new Database({
        fetch: async ({ documentName }) => persisted.get(documentName) ?? null,
        store: async ({ documentName, state }) => {
          persisted.set(documentName, state);
        },
      }),
      createTaskCoordinatorExtension(store.options),
    ],
  });
  servers.push(server);
  await server.listen();
  return server;
}
function socket(server: Server) {
  const value = new HocuspocusProviderWebsocket({ url: server.webSocketURL });
  sockets.push(value);
  return { websocketProvider: value };
}
async function producer(server: Server, serverToken = token) {
  const provider = new ServerRealtimeProvider({
    documentName: getTaskQueueDocumentName(),
    serverToken,
    websocketProvider: socket(server),
  });
  providers.push(provider);
  await provider.waitForSynced();
  return provider;
}
it("starts only one handler when two real worker connections race", async () => {
  const store = taskClaimStore();
  const server = await start(store);
  const source = await producer(server);
  addTask(source.document, {
    id: crypto.randomUUID(),
    state: "pending",
    type: "model-do-generate",
    parameters: { modelId: "model" },
    requiredCapabilities: [],
  } as any);
  await source.waitForSynced();
  const started = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  let count = 0;
  const runs = [0, 1].map(() => {
    const stop = new AbortController();
    stops.push(stop);
    const worker = new TaskQueue("model-do-generate", {
      capabilities: [],
      serverToken: token,
      websocketProvider: socket(server),
      workerIdentifier: "same-name-on-two-machines",
    });
    return worker.handleTask(
      async () => {
        count++;
        started.resolve();
        await finish.promise;
        stop.abort();
        return {} as any;
      },
      { abortSignal: stop.signal },
    );
  });
  try {
    await started.promise;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(count).toBe(1);
    expect(store.records.size).toBe(1);
  } finally {
    finish.resolve();
    stops.forEach((stop) => stop.abort());
    await Promise.all(runs);
  }
  expect([...store.records.values()][0]?.state).toBe("finished");
});
function enqueueChats(source: ServerRealtimeProvider, count: number): string[] {
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  const agentId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  for (const id of ids) {
    addTask(source.document, {
      id,
      state: "pending",
      type: "chat",
      parameters: { agentId, activityId: id, userId, userClaims: [] },
      requiredCapabilities: [],
    });
  }
  return ids;
}
function chatQueue(server: Server, workerIdentifier: string) {
  return new TaskQueue("chat", {
    capabilities: [],
    concurrency: 4,
    serverToken: token,
    websocketProvider: socket(server),
    workerIdentifier,
  });
}
it("processes four chats on one worker and claims the fifth when a slot opens", async () => {
  const server = await start(taskClaimStore());
  const source = await producer(server);
  const ids = enqueueChats(source, 5);
  const stop = new AbortController();
  const finishFirst = Promise.withResolvers<void>();
  const finishOthers = Promise.withResolvers<void>();
  const started: string[] = [];
  const run = chatQueue(server, "worker").handleTask(
    async (task) => {
      started.push(task.id);
      await (task.id === ids[0] ? finishFirst : finishOthers).promise;
    },
    { abortSignal: stop.signal },
  );
  try {
    await vi.waitFor(
      () => {
        expect(started).toHaveLength(4);
        const pending = getTaskQueue(source.document)
          .tasks.toArray()
          .filter((task) => task.state === "pending");
        expect(pending.map((task) => task.id)).toEqual(ids.slice(4));
      },
      { timeout: 5000 },
    );
    finishFirst.resolve();
    await vi.waitFor(() => expect(started.toSorted()).toEqual(ids.toSorted()), {
      timeout: 5000,
    });
  } finally {
    finishFirst.resolve();
    finishOthers.resolve();
    stop.abort();
    await run;
  }
});
it("shares a burst between two workers and favors the less loaded one on new arrivals", async () => {
  const store = taskClaimStore();
  const server = await start(store);
  const source = await producer(server);
  const initial = enqueueChats(source, 4);
  const stop = new AbortController();
  const releaseA = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const started = { a: [] as string[], b: [] as string[] };
  const runs = (["a", "b"] as const).map((worker) =>
    chatQueue(server, worker).handleTask(
      async (task) => {
        started[worker].push(task.id);
        await (worker === "a" && initial.includes(task.id) ? releaseA : finish)
          .promise;
      },
      { abortSignal: stop.signal },
    ),
  );
  try {
    await vi.waitFor(
      () => {
        expect(started.a).toHaveLength(2);
        expect(started.b).toHaveLength(2);
      },
      { timeout: 5000 },
    );
    releaseA.resolve();
    await vi.waitFor(() =>
      expect(
        started.a.every((id) => store.records.get(id)?.state === "finished"),
      ).toBe(true),
    );
    const next = enqueueChats(source, 2);
    await vi.waitFor(() => expect(started.a.slice(2)).toEqual(next), {
      timeout: 5000,
    });
    expect(started.b).toHaveLength(2);
  } finally {
    releaseA.resolve();
    finish.resolve();
    stop.abort();
    await Promise.all(runs);
  }
});
it("restores a crashed owner's claim after a real server restart without executing it again", async () => {
  const store = taskClaimStore();
  const persisted = new Map<string, Uint8Array>();
  let server = await start(store, persisted);
  let source = await producer(server);
  const id = crypto.randomUUID();
  addTask(source.document, {
    id,
    state: "pending",
    type: "model-do-generate",
    parameters: { modelId: "model" },
    requiredCapabilities: [],
  } as any);
  await source.waitForSynced();
  const response = await requestTaskCoordinator(source.provider, {
    action: "claim",
    type: "model-do-generate",
    capabilities: [],
    worker: "crashed",
  });
  const claimed = decodeTaskValue<Extract<Task, { state: "claimed" }>>(
    response.task!,
  );
  source.provider.destroy();
  source.document.destroy();
  sockets.forEach((value) => value.destroy());
  await server.destroy();
  store.records.get(id)!.expires_at = new Date(Date.now() - 1).toISOString();
  server = await start(store, persisted);
  source = await producer(server);
  expect(
    getTaskQueue(source.document)
      .tasks.toArray()
      .find((task) => task.id === id),
  ).toMatchObject({ state: "error", error: "TASK_WORKER_LOST" });
  expect(
    (
      await requestTaskCoordinator(source.provider, {
        action: "claim",
        type: "model-do-generate",
        capabilities: [],
        worker: "replacement",
      })
    ).task,
  ).toBeUndefined();
  expect(
    (
      await requestTaskCoordinator(source.provider, {
        action: "finish",
        taskId: id,
        token: claimed.claimToken!,
      })
    ).accepted,
  ).toBe(false);
});
it("does not accept worker commands from a user-authorized document connection", async () => {
  const store = taskClaimStore();
  const server = await start(store);
  const source = await producer(server, "User test-user" as any);
  const stop = new AbortController();
  const waiting = requestTaskCoordinator(
    source.provider,
    {
      action: "claim",
      type: "chat",
      capabilities: [],
      worker: "pretend-worker",
    },
    stop.signal,
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  stop.abort();
  await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
  expect(
    store.supabase.rpc.mock.calls.some(
      ([name]) => name === "claim_background_task",
    ),
  ).toBe(false);
});
