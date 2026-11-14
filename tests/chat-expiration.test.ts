import { Doc, applyUpdate } from "yjs";
import { afterEach, expect, it, vi } from "vitest";
import { setChatExpiration } from "../packages/database/src/chat/setChatExpiration.ts";
import { getChatExpiration } from "../packages/database/src/chat/getChatExpiration.ts";
import { beginChatExpiration } from "../packages/database/src/chat/beginChatExpiration.ts";
import { finishChatExpiration } from "../packages/database/src/chat/finishChatExpiration.ts";
import { isChatDeleted } from "../packages/database/src/chat/isChatDeleted.ts";
import { createChatExpirationExtension } from "../packages/realtime/src/server/createChatExpirationExtension.ts";
import { expireChat } from "../apps/realtime/src/scheduler/expireChat.ts";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue.ts";
import { upsertActivity } from "../packages/realtime/src/documents/activity/upsertActivity.ts";
import { getActivities } from "../packages/realtime/src/documents/activity/getActivities.ts";
import { query } from "./helpers/supabase.ts";
const mocks = vi.hoisted(() => ({
  docs: new Map<string, any>(),
  remove: vi.fn(),
  waits: vi.fn(),
}));
vi.mock("@schornio/aibox-database/storage/remove", () => ({
  remove: mocks.remove,
}));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  mocks.docs.clear();
  mocks.remove.mockReset();
  mocks.waits.mockReset();
});
const input = {
  agentId: "11111111-1111-4111-8111-111111111111",
  activityId: "22222222-2222-4222-8222-222222222222",
  seconds: 43_200,
};
const name = `activity_chat___${input.activityId}_${input.agentId}`;
it("atomically changes deadlines, supports disabling and sanitizes RPC failures", async () => {
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: "2030-01-01T00:00:00Z", error: null });
  const options = { userId: "owner", supabase: { rpc } as any };
  await expect(setChatExpiration(input, options)).resolves.toEqual({
    seconds: 43_200,
    expiresAt: "2030-01-01T00:00:00Z",
  });
  await setChatExpiration({ ...input, seconds: null }, options);
  expect(rpc).toHaveBeenLastCalledWith("set_chat_expiration", {
    p_document_name: name,
    p_user_id: "owner",
    p_seconds: null,
  });
  for (const seconds of [0, 60, 3600, 61, 31_536_060])
    await expect(
      setChatExpiration({ ...input, seconds }, options),
    ).rejects.toThrow();
  rpc.mockResolvedValue({ error: { message: "secret" } });
  await expect(setChatExpiration(input, options)).rejects.toThrow(
    "CHAT_EXPIRATION_SAVE_FAILED",
  );
  await expect(beginChatExpiration(name, "token", options)).rejects.toThrow(
    "CHAT_EXPIRATION_BEGIN_FAILED",
  );
  await expect(isChatDeleted(name, options)).rejects.toThrow(
    "CHAT_DELETION_CHECK_FAILED",
  );
  rpc.mockClear();
  expect(await isChatDeleted("taskQueue", options)).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
});
it("reads only the authorized chat and rejects unavailable data", async () => {
  const row = query({ data: { expires_at: null, expiry_seconds: null } });
  const options = { supabase: { from: () => row } as any };
  await expect(getChatExpiration(input, options)).resolves.toEqual({
    seconds: null,
    expiresAt: null,
  });
  expect(row.eq).toHaveBeenCalledWith("document_name", name);
  const missing = { supabase: { from: () => query({ data: null }) } as any };
  await expect(getChatExpiration(input, missing)).rejects.toThrow(
    "CHAT_ACCESS_DENIED",
  );
  await expect(
    finishChatExpiration("id", {
      supabase: { from: () => query({ error: {} }) } as any,
    }),
  ).rejects.toThrow("CHAT_EXPIRATION_FINISH_FAILED");
});
it("fences syncs and loaded idle documents on every realtime server", async () => {
  vi.useFakeTimers();
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  const extension = createChatExpirationExtension({ supabase: { rpc } as any });
  const document = { broadcastStateless: vi.fn() };
  const instance = {
    documents: new Map([
      [name, document],
      ["taskQueue", {}],
    ]),
    closeConnections: vi.fn(),
    unloadDocument: vi.fn(),
  };
  await expect(
    extension.onLoadDocument!({ documentName: name } as any),
  ).rejects.toThrow("CHAT_DELETED");
  await expect(
    extension.beforeSync!({ documentName: name } as any),
  ).rejects.toThrow("CHAT_DELETED");
  await extension.onListen!({ instance } as any);
  await vi.advanceTimersByTimeAsync(1000);
  expect(instance.closeConnections).toHaveBeenCalledWith(name);
  expect(document.broadcastStateless).toHaveBeenCalledWith(
    '{"type":"chat-deleted"}',
  );
  rpc.mockResolvedValue({ data: false, error: null });
  await expect(
    extension.beforeSync!({ documentName: name } as any),
  ).resolves.toBeUndefined();
  await extension.onDestroy!({} as any);
});
function fixture(active = false) {
  const queue = new Doc();
  const history = new Doc();
  mocks.docs.set("taskQueue", queue);
  mocks.docs.set("activity___owner", history);
  upsertActivity(history, {
    id: input.activityId,
    content: { type: "chat", chatbotId: input.agentId },
  });
  const { tasks, abortRequests } = getTaskQueue(queue);
  if (active)
    tasks.push([
      { id: "busy", type: "chat", state: "claimed", parameters: input } as any,
    ]);
  mocks.waits.mockImplementation(async () => {
    if (abortRequests.has("busy")) {
      tasks.delete(0);
      tasks.push([
        {
          id: "busy",
          type: "chat",
          state: "aborted",
          parameters: input,
        } as any,
      ]);
    }
  });
  const access = query({
    data: { realtime_document_access: [{ user_id: "owner" }] },
  });
  const revoke = query();
  const rpc = vi.fn().mockResolvedValue({ data: [{ id: "doc" }], error: null });
  const saved = new Map<string, Uint8Array>();
  access.upsert.mockImplementation((row: any) => {
    saved.set(
      row.document_name,
      new Uint8Array(Buffer.from(row.document_data.slice(2), "hex")),
    );
    return query();
  });
  const instance = {
    openDirectConnection: vi.fn(async (name: string) => {
      const document = mocks.docs.get(name);
      Object.assign(document, {
        name,
        saveMutex: {
          runExclusive: async (fn: any) => {
            await fn();
            await mocks.waits(document);
          },
        },
      });
      return {
        document,
        transact: async (fn: any) => document.transact(() => fn(document)),
        disconnect: vi.fn(async () => {}),
      };
    }),
  };
  const from = vi.fn((table: string) =>
    table === "realtime_documents" ? access : revoke,
  );
  const supabase = { rpc, from, storage: { from: vi.fn() } } as any;
  const job = { payload: { documentName: name }, lease_token: "token" } as any;
  return {
    history,
    saved,
    access,
    abortRequests,
    rpc,
    revoke,
    run: (signal = new AbortController().signal) =>
      expireChat(job, signal, { supabase, instance: instance as any }),
  };
}
it("stops active work then removes files, shared history and access, retaining the tombstone", async () => {
  const f = fixture(true);
  await f.run();
  expect(f.abortRequests.has("busy")).toBe(false);
  expect(f.rpc).toHaveBeenCalledWith("purge_chat_task_snapshots", {
    p_document_name: name,
  });
  expect(mocks.remove).toHaveBeenCalledWith(
    "",
    expect.objectContaining({
      storage: {
        type: "activity",
        activityId: input.activityId,
        agentId: input.agentId,
      },
    }),
    expect.anything(),
  );
  expect(getActivities(f.history).activities.has(input.activityId)).toBe(false);
  expect(f.revoke.delete).toHaveBeenCalled();
  const restored = new Doc();
  applyUpdate(restored, f.saved.get("activity___owner")!);
  expect(getActivities(restored).activities.has(input.activityId)).toBe(false);
});
it("does nothing for a stale lease and preserves access for retries after cleanup failure", async () => {
  const f = fixture();
  f.rpc.mockResolvedValueOnce({ data: [], error: null });
  await f.run();
  expect(mocks.remove).not.toHaveBeenCalled();
  mocks.remove.mockRejectedValueOnce(new Error("storage offline"));
  await expect(f.run()).rejects.toThrow("storage offline");
  expect(f.revoke.delete).not.toHaveBeenCalled();
  expect(getActivities(f.history).activities.has(input.activityId)).toBe(true);
  await f.run();
  expect(f.revoke.delete).toHaveBeenCalled();
});
it("does not begin deleting after scheduler cancellation", async () => {
  const f = fixture();
  const stop = new AbortController();
  stop.abort(new Error("stopped"));
  await expect(f.run(stop.signal)).rejects.toThrow("stopped");
  expect(f.rpc).not.toHaveBeenCalled();
});

it("leaves cleanup retryable when durable persistence fails", async () => {
  const f = fixture();
  f.access.upsert.mockImplementationOnce(() =>
    query({ error: new Error("offline") }),
  );
  await expect(f.run()).rejects.toThrow("REALTIME_DOCUMENT_SAVE_FAILED");
  expect(f.revoke.delete).not.toHaveBeenCalled();
  await f.run();
  expect(f.revoke.delete).toHaveBeenCalled();
});
