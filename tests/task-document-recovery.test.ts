import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Doc, applyUpdate } from "yjs";
import { recoverTaskDocuments } from "../packages/realtime/src/server/recoverTaskDocuments";
import { getChatDocumentName } from "../packages/realtime/src/documents/chat/_utils";
import { getChatCurrentMessageDocumentName } from "../packages/realtime/src/documents/chatCurrentMessage/_utils";
import { getActivitiesDocumentName } from "../packages/realtime/src/documents/activity/_utils";
import { setChatState } from "../packages/realtime/src/documents/chat/setChatState";
import { upsertActivity } from "../packages/realtime/src/documents/activity/upsertActivity";
import { getChatCurrentMessageBatch } from "../packages/realtime/src/documents/chatCurrentMessage/getChatCurrentMessageBatch";
const access = vi.hoisted(() => vi.fn());
vi.mock(
  "../packages/realtime/src/_lib/getAllowedUserIdsByDocumentName",
  () => ({ getAllowedUserIdsByDocumentName: access }),
);
const parameters = { activityId: "activity", agentId: "agent" };
const task: any = {
  id: "lost-generation",
  type: "chat",
  parameters,
  state: "error",
  error: "TASK_WORKER_LOST",
};
let documents: Map<string, Doc>;
let saved: Map<string, Uint8Array>;
let instance: any;
let options: any;
let failSave: string | undefined;
const get = (name: string) => documents.get(name)!;
const chatName = getChatDocumentName(parameters);
const currentName = getChatCurrentMessageDocumentName(parameters);
const activityName = getActivitiesDocumentName({ userId: "user" });
beforeEach(() => {
  documents = new Map(
    [chatName, currentName, activityName].map((name) => [name, new Doc()]),
  );
  saved = new Map();
  failSave = undefined;
  access.mockResolvedValue(["user"]);
  setChatState(get(chatName), {
    type: "generating",
    generationId: task.id,
    claimedAtISO: new Date().toISOString(),
    claimedWorkerId: "gone",
  });
  get(chatName).getMap("cancellations").set(task.id, true);
  getChatCurrentMessageBatch(get(currentName)).push([
    { id: "queued", state: "queued", content: { type: "text", text: "next" } },
    {
      id: "submitted",
      state: "submitted",
      content: { type: "text", text: "later" },
    },
    { id: "draft", state: "paused", content: { type: "text", text: "draft" } },
    {
      id: "approval",
      state: "submitted",
      content: {
        type: "tool-approval",
        approvalId: "approval",
        approved: true,
      },
    },
  ]);
  upsertActivity(get(activityName), {
    id: parameters.activityId,
    state: "running",
    label: "Keep title",
  });
  instance = {
    openDirectConnection: vi.fn(async (name: string) => ({
      document: Object.assign(get(name), {
        name,
        saveMutex: {
          runExclusive: async (operation: () => Promise<void>) => operation(),
        },
      }),
      transact: async (operation: (doc: Doc) => void) =>
        get(name).transact(() => operation(get(name))),
      disconnect: vi.fn(async () => {}),
    })),
  };
  options = {
    supabaseServiceRole: {
      from: () => ({
        upsert: ({ document_name, document_data }: any) => ({
          abortSignal: async () => {
            if (failSave === document_name)
              return { error: new Error("database unavailable") };
            saved.set(
              document_name,
              new Uint8Array(Buffer.from(document_data.slice(2), "hex")),
            );
            return { error: null };
          },
        }),
      }),
    },
  };
});
afterEach(() => {
  documents.forEach((doc) => doc.destroy());
  vi.clearAllMocks();
});
it("durably releases the crashed generation, pauses remaining text inputs and updates its activity", async () => {
  await recoverTaskDocuments(instance, task, options);
  const restored = new Doc();
  applyUpdate(restored, saved.get(chatName)!);
  expect(restored.getMap("state").toJSON()).toMatchObject({
    type: "error",
    generationId: task.id,
    error: "TASK_WORKER_LOST",
  });
  expect(restored.getMap("cancellations").size).toBe(0);
  restored.destroy();
  expect(
    getChatCurrentMessageBatch(get(currentName))
      .toArray()
      .map((item) => [item.id, item.state]),
  ).toEqual([
    ["queued", "paused"],
    ["submitted", "paused"],
    ["draft", "paused"],
    ["approval", "submitted"],
  ]);
  expect(
    get(activityName).getMap("activities").get(parameters.activityId),
  ).toMatchObject({ state: "error", label: "Keep title" });
  expect([...saved.keys()]).toEqual([currentName, chatName, activityName]);
});
it("does not change a later generation or its submitted inputs", async () => {
  setChatState(get(chatName), {
    type: "queued",
    generationId: "new-generation",
  });
  await recoverTaskDocuments(instance, task, options);
  expect(saved.size).toBe(0);
  expect(getChatCurrentMessageBatch(get(currentName)).get(0).state).toBe(
    "queued",
  );
  expect(access).not.toHaveBeenCalled();
});
it("rechecks the generation after loading the input document", async () => {
  const open = instance.openDirectConnection.getMockImplementation();
  instance.openDirectConnection.mockImplementation(async (name: string) => {
    if (name === currentName)
      setChatState(get(chatName), {
        type: "queued",
        generationId: "new-generation",
      });
    return open(name);
  });
  await recoverTaskDocuments(instance, task, options);
  expect(saved.size).toBe(0);
  expect(getChatCurrentMessageBatch(get(currentName)).get(0).state).toBe(
    "queued",
  );
});
it("reports persistence failure and can finish the same recovery on retry", async () => {
  failSave = chatName;
  await expect(recoverTaskDocuments(instance, task, options)).rejects.toThrow(
    "REALTIME_DOCUMENT_SAVE_FAILED",
  );
  expect(saved.has(chatName)).toBe(false);
  failSave = undefined;
  await recoverTaskDocuments(instance, task, options);
  expect(saved.has(chatName)).toBe(true);
  expect(
    get(activityName).getMap("activities").get(parameters.activityId),
  ).toMatchObject({ state: "error" });
});
it.each(["finished", "aborted"])(
  "recovers %s tasks that exited before clearing their busy chat",
  async (state) => {
    await recoverTaskDocuments(instance, { ...task, state }, options);
    expect(get(chatName).getMap("state").get("type")).toBe("idle");
    expect(getChatCurrentMessageBatch(get(currentName)).get(0).state).toBe(
      state === "finished" ? "queued" : "paused",
    );
    expect(
      get(activityName).getMap("activities").get(parameters.activityId),
    ).toMatchObject({ state: state === "finished" ? "success" : "idle" });
  },
);

it("persists interrupted compression status after the worker is lost", async () => {
  get(chatName)
    .getArray("messages")
    .push([
      {
        id: "response",
        role: "assistant",
        parts: [
          {
            type: "data-contextCompression",
            id: "summary",
            data: { state: "pending" },
          },
        ],
      },
    ]);
  await recoverTaskDocuments(instance, task, options);
  const restored = new Doc();
  applyUpdate(restored, saved.get(chatName)!);
  expect(restored.getArray<any>("messages").get(0).parts[0].data.state).toBe(
    "interrupted",
  );
});
