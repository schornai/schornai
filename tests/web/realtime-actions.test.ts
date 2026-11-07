vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { revalidatePath } from "next/cache";
vi.mock(
  "@schornio/aibox-package-database/storage/requireStorageAccess",
  () => ({ requireStorageAccess: vi.fn() }),
);
import { Doc } from "yjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTaskQueue } from "../../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { getActivities } from "../../packages/realtime/src/documents/activity/getActivities";
import { upsertActivity } from "../../packages/realtime/src/documents/activity/upsertActivity";
import { submitCurrentMessage } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_actions/submitCurrentMessage";
import { storageQueueProcessFiles } from "../../apps/web/app/_actions/storageQueueProcessFiles";
import { deleteActivity } from "../../apps/web/app/(main)/_actions/deleteActivity";
import { ensureActivity } from "../../apps/web/lib/ensureActivity";
import { abortChatGeneration } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_actions/abortChatGeneration";
import { addChatCurrentMessage } from "../../packages/realtime/src/documents/chatCurrentMessage/addChatCurrentMessage";
import { getChatCurrentMessageBatch } from "../../packages/realtime/src/documents/chatCurrentMessage/getChatCurrentMessageBatch";
import { normalizeChatCurrentMessage } from "../../packages/realtime/src/documents/chatCurrentMessage/normalizeChatCurrentMessage";
import { setChatCurrentMessageState } from "../../packages/realtime/src/documents/chatCurrentMessage/setChatCurrentMessageState";
import { replaceTask } from "../../packages/realtime/src/documents/taskQueue/replaceTask";
const mocks = vi.hoisted(() => ({
  docs: [] as any[],
  batchDocs: [] as any[],
  allowed: [] as string[],
  transcriber: undefined as any,
  agent: undefined as any,
  repository: undefined as any,
  ensure: vi.fn(),
  sync: vi.fn(),
  dispose: vi.fn(),
  redirect: vi.fn(),
  workspace: vi.fn(),
  claims: [{ organization_id: "workspace", role: "user" }] as any,
}));
vi.mock("@/lib/authorizeStorageMutation", () => ({
  authorizeStorageMutation: async () => ({
    user: { id: "user" },
    userClaims: mocks.claims,
  }),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => ({}),
}));
vi.mock("@schornio/aibox-database/user/getCurrentUser", () => ({
  getCurrentUser: async () => ({ id: "user" }),
}));
vi.mock("@schornio/aibox-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: async () => mocks.claims,
}));
vi.mock("@schornio/aibox-package-database/agent/getAgentWorkspaceId", () => ({
  getAgentWorkspaceId: mocks.workspace,
}));
vi.mock(
  "@schornio/aibox-package-database/transcriber/getTranscriberById",
  () => ({ getTranscriberById: async () => mocks.transcriber }),
);
vi.mock("@schornio/aibox-package-database/transcriber/getTranscribers", () => ({
  getTranscribers: async () => (mocks.transcriber ? [mocks.transcriber] : []),
}));
vi.mock("@schornio/aibox-package-database/agent/getAgentById", () => ({
  getAgentById: async () => mocks.agent,
}));
vi.mock(
  "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoryById",
  () => ({
    getDocumentRepositoryById: async () => mocks.repository,
  }),
);
vi.mock("@schornio/aibox-realtime/server/ensureDocument", () => ({
  ensureDocument: mocks.ensure,
}));
vi.mock(
  "@schornio/aibox-realtime/_lib/getAllowedUserIdsByDocumentName",
  () => ({ getAllowedUserIdsByDocumentName: async () => mocks.allowed }),
);
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = mocks.docs.shift();
    waitForSynced = mocks.sync;
    [Symbol.asyncDispose]() {
      mocks.dispose();
      return Promise.resolve();
    }
  },
  ServerBatchRealtimeProvider: class {
    documents = mocks.batchDocs;
    waitForSynced = mocks.sync;
    batch(fn: any, ...args: any[]) {
      this.documents.forEach((doc) => fn(doc, ...args));
    }
    [Symbol.asyncDispose]() {
      mocks.dispose();
      return Promise.resolve();
    }
  },
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
beforeEach(() => {
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockReset();
  mocks.docs = [];
  mocks.batchDocs = [];
  mocks.allowed = ["user", "other"];
  mocks.transcriber = {
    identifier: "custom-transcriber",
    modelIdentifier: "whisper",
    prompt: "Prompt",
  };
  mocks.agent = { transcriberIdentifier: "custom-transcriber" };
  mocks.repository = { transcriberIdentifier: "custom-transcriber" };
  mocks.claims = [{ organization_id: "workspace", role: "user" }];
  mocks.sync.mockResolvedValue(undefined);
  mocks.workspace.mockResolvedValue("workspace");
});
describe("realtime server actions", () => {
  it("ensures access, queues the chat and publishes a task with user claims", async () => {
    const queue = new Doc(),
      chat = new Doc();
    mocks.docs = [queue, chat];
    await submitCurrentMessage({ activityId: "activity", agentId: "agent" });
    expect(mocks.ensure).toHaveBeenCalledWith(
      "activity_chat___activity_agent",
      { userIds: ["user"] },
      { supabase: {} },
    );
    expect(chat.getMap("state").get("type")).toBe("queued");
    expect(getTaskQueue(queue).tasks.toArray()[0]).toMatchObject({
      type: "chat",
      state: "pending",
      parameters: {
        userId: "user",
        userClaims: [{ organization_id: "workspace", role: "user" }],
        agentId: "agent",
        activityId: "activity",
      },
    });
    expect(mocks.sync).toHaveBeenCalledTimes(4);
    expect(mocks.dispose).toHaveBeenCalledTimes(2);
  });
  it.each([
    { claims: [] },
    { claims: [{ organization_id: "other", role: "user" }] },
  ])(
    "rejects chat submission without access before creating privileged documents (%j)",
    async ({ claims }) => {
      mocks.claims = claims;
      await expect(
        submitCurrentMessage({ activityId: "activity", agentId: "agent" }),
      ).rejects.toThrow("NOT_AUTHORIZED");
      expect(mocks.ensure).not.toHaveBeenCalled();
      expect(mocks.sync).not.toHaveBeenCalled();
    },
  );
  it.each(["pending", "claimed"])(
    "cancels a %s chat, pauses queued drafts and leaves other jobs unchanged",
    async (state) => {
      const queue = new Doc(),
        chat = new Doc(),
        current = new Doc(),
        activities = new Doc();
      mocks.docs = [queue, chat, current];
      mocks.batchDocs = [activities];
      const { tasks } = getTaskQueue(queue);
      tasks.push([
        {
          id: "active",
          type: "chat",
          state,
          requiredCapabilities: [],
          parameters: {
            activityId: "activity",
            agentId: "agent",
            userId: "user",
            userClaims: mocks.claims,
          },
        },
        {
          id: "other",
          type: "chat",
          state: "pending",
          requiredCapabilities: [],
          parameters: {
            activityId: "other",
            agentId: "agent",
            userId: "user",
            userClaims: mocks.claims,
          },
        },
      ] as any);
      const { messageId } = addChatCurrentMessage(current, {
        type: "text",
        text: "Next draft",
      });
      setChatCurrentMessageState(current, messageId, "queued");
      upsertActivity(activities, {
        id: "activity",
        state: "running",
        label: "Preserved label",
      });
      getTaskQueue(queue).abortRequests.observe(() => {
        queueMicrotask(() => {
          acknowledgeAbort(queue, "active");
        });
      });
      await abortChatGeneration({ activityId: "activity", agentId: "agent" });
      expect(tasks.get(0).state).toBe("aborted");
      expect(tasks.get(1).state).toBe("pending");
      expect(chat.getMap("state").get("type")).toBe("idle");
      expect(
        getChatCurrentMessageBatch(current)
          .toArray()
          .map(normalizeChatCurrentMessage)[0],
      ).toMatchObject({ state: "paused", content: { text: "Next draft" } });
      expect(
        getActivities(activities).activities.get("activity"),
      ).toMatchObject({ state: "idle", label: "Preserved label" });
      expect(mocks.dispose).toHaveBeenCalledTimes(4);
    },
  );
  it("rejects cancellation of someone else's chat before opening realtime documents", async () => {
    mocks.allowed = ["other"];
    await expect(
      abortChatGeneration({ activityId: "activity", agentId: "agent" }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it.each(["activity", "documentRepository", "activity-transcription"])(
    "queues supported files for storage %s",
    async (type) => {
      const queue = new Doc();
      mocks.docs = [queue];
      const storage =
        type === "activity"
          ? { type, activityId: "activity", agentId: "agent" }
          : type === "documentRepository"
            ? { type, documentRepositoryId: "repo", workspaceId: "workspace" }
            : { type, activityId: "activity", transcriberId: "transcriber" };
      await storageQueueProcessFiles({
        storage,
        filePaths: [
          "report.pdf",
          "code.ts",
          "notes.txt",
          "audio.mp3",
          "video.mp4",
          "image.png",
        ],
      } as any);
      const tasks = getTaskQueue(queue).tasks.toArray();
      expect(
        tasks
          .filter((task) => task.type === "process-file")
          .map((task) => task.parameters.path),
      ).toEqual(["report.pdf", "code.ts", "notes.txt", "image.png"]);
      const transcriptions = tasks.filter((task) => task.type === "transcribe");
      expect(transcriptions.map((task) => task.parameters.path)).toEqual([
        "audio.mp3",
        "video.mp4",
      ]);
      for (const task of transcriptions)
        expect(task.parameters).toMatchObject({
          modelIdentifier: "whisper",
          modelPrompt: "Prompt",
          storage,
          userId: "user",
          userClaims: mocks.claims,
        });
      expect(mocks.sync).toHaveBeenCalledTimes(2);
      expect(mocks.dispose).toHaveBeenCalledOnce();
    },
  );
  it.each(["activity", "documentRepository"])(
    "only uses the configured transcriber for %s storage",
    async (type) => {
      const storage =
        type === "activity"
          ? { type, activityId: "activity", agentId: "agent" }
          : { type, documentRepositoryId: "repo" };
      const queue = new Doc();
      mocks.agent = mocks.repository = {};
      mocks.docs = [queue];
      await storageQueueProcessFiles({
        storage,
        filePaths: ["audio.mp3"],
      } as any);
      expect(getTaskQueue(queue).tasks.length).toBe(0);

      mocks.agent = mocks.repository = { transcriberIdentifier: "missing" };
      mocks.docs = [queue];
      await expect(
        storageQueueProcessFiles({ storage, filePaths: ["audio.mp3"] } as any),
      ).rejects.toThrow("TRANSCRIBER_NOT_FOUND");
      expect(getTaskQueue(queue).tasks.length).toBe(0);
    },
  );
  it("skips audio without a configured model and handles empty uploads", async () => {
    mocks.transcriber = {};
    const queue = new Doc();
    mocks.docs = [queue];
    await storageQueueProcessFiles({
      storage: {
        type: "activity-transcription",
        activityId: "activity",
        transcriberId: "transcriber",
      },
      filePaths: ["audio.mp3"],
    });
    expect(getTaskQueue(queue).tasks.length).toBe(0);
    mocks.docs = [queue];
    await storageQueueProcessFiles({
      storage: { type: "activity", activityId: "activity", agentId: "agent" },
      filePaths: [],
    });
    expect(getTaskQueue(queue).tasks.length).toBe(0);
  });
  it.each(["allowed", "revoked", "missing"])(
    "deletes activity references with %s access",
    async (mode) => {
      const own = new Doc(),
        other = new Doc();
      mocks.docs = [own];
      mocks.batchDocs = [own, other];
      if (mode !== "missing") {
        for (const doc of [own, other])
          upsertActivity(doc, {
            id: "activity",
            content: { type: "chat", chatbotId: "agent" },
          });
      }
      if (mode === "revoked") mocks.allowed = ["other"];
      await deleteActivity({
        activityId: "activity",
        redirectToDashboard: true,
      });
      expect(getActivities(own).activities.has("activity")).toBe(false);
      expect(getActivities(other).activities.has("activity")).toBe(
        mode === "revoked",
      );
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mocks.redirect).toHaveBeenCalledWith("/");
    },
  );
  it.each([
    { type: "activity", activityId: "activity", agentId: "agent" },
    {
      type: "activity-transcription",
      activityId: "activity",
      transcriberId: "transcriber",
    },
  ])("ensures shared activity metadata for %j", async (storage) => {
    const own = new Doc(),
      other = new Doc();
    mocks.batchDocs = [own, other];
    await ensureActivity("user", storage as any, {
      labelOnInsert: "Uploaded file",
    });
    for (const doc of [own, other])
      expect(getActivities(doc).activities.get("activity")).toMatchObject({
        label: "Uploaded file",
        content: {
          type: storage.type === "activity" ? "chat" : "transcription",
        },
      });
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
});

import { pinActivity } from "../../apps/web/app/(main)/_actions/pinActivity";
it("pins an existing activity without moving its last update timestamp", async () => {
  const doc = new Doc();
  mocks.docs = [doc];
  upsertActivity(doc, { id: "activity", updatedAtISO: "2025-01-01" });
  await pinActivity({ activityId: "activity", pinned: true });
  expect(getActivities(doc).activities.get("activity")).toMatchObject({
    pinned: true,
    updatedAtISO: "2025-01-01",
  });
  expect(mocks.dispose).toHaveBeenCalledOnce();
});

function cancellationFixture(state = "claimed") {
  const queue = new Doc(),
    chat = new Doc(),
    current = new Doc(),
    activities = new Doc();
  mocks.docs = [queue, chat, current];
  mocks.batchDocs = [activities];
  getTaskQueue(queue).tasks.push([
    {
      id: "old",
      type: "chat",
      state,
      requiredCapabilities: [],
      parameters: {
        activityId: "activity",
        agentId: "agent",
        userId: "user",
        userClaims: [],
      },
    } as any,
  ]);
  chat
    .getMap("state")
    .set("type", state === "finished" ? "idle" : "generating");
  chat.getMap("state").set("generationId", "old");
  upsertActivity(activities, {
    id: "activity",
    state: state === "finished" ? "success" : "running",
  });
  return { queue, chat, current, activities };
}

it("a delayed Stop preserves completed success while flushing paused drafts", async () => {
  const { chat, current, activities } = cancellationFixture("finished");
  const { messageId } = addChatCurrentMessage(current, {
    type: "text",
    text: "Keep",
  });
  setChatCurrentMessageState(current, messageId, "queued");
  await abortChatGeneration({ activityId: "activity", agentId: "agent" });
  expect(chat.getMap("state").get("type")).toBe("idle");
  expect(getActivities(activities).activities.get("activity")?.state).toBe(
    "success",
  );
  expect(
    getChatCurrentMessageBatch(current)
      .toArray()
      .map(normalizeChatCurrentMessage)[0].state,
  ).toBe("paused");
  expect(mocks.sync).toHaveBeenCalledTimes(5);
});

it("does not reset a newer generation when old cancellation completes", async () => {
  const { queue, chat, activities } = cancellationFixture();
  getTaskQueue(queue).abortRequests.observe(() =>
    queueMicrotask(() => {
      chat.getMap("state").set("type", "queued");
      chat.getMap("state").set("generationId", "new");
      upsertActivity(activities, { id: "activity", state: "running" });
      acknowledgeAbort(queue, "old");
    }),
  );
  await abortChatGeneration({ activityId: "activity", agentId: "agent" });
  expect(chat.getMap("state").get("type")).toBe("queued");
  expect(chat.getMap("state").get("generationId")).toBe("new");
  expect(getActivities(activities).activities.get("activity")?.state).toBe(
    "running",
  );
  expect(chat.getMap("cancellations").size).toBe(0);
});

it("blocks submission while cancellation cleanup is still holding the chat", async () => {
  const queue = new Doc(),
    chat = new Doc();
  mocks.docs = [queue, chat];
  chat.getMap("state").set("type", "idle");
  chat.getMap("cancellations").set("stop", true);
  await expect(
    submitCurrentMessage({ activityId: "activity", agentId: "agent" }),
  ).rejects.toThrow("CHAT_BUSY");
  expect(getTaskQueue(queue).tasks.length).toBe(0);
});

it("distinguishes a missing agent without creating privileged realtime documents", async () => {
  mocks.workspace.mockResolvedValue(undefined);
  await expect(
    submitCurrentMessage({ activityId: "activity", agentId: "missing" }),
  ).rejects.toThrow("NOT_FOUND");
  expect(mocks.ensure).not.toHaveBeenCalled();
});

it.each(["user", "editor", "workspace-admin", "admin"])(
  "permits the %s role after resolving workspace identity",
  async (role) => {
    mocks.claims =
      role === "admin" ? "admin" : [{ organization_id: "workspace", role }];
    mocks.docs = [new Doc(), new Doc()];
    await submitCurrentMessage({ activityId: "activity", agentId: "agent" });
    expect(mocks.workspace).toHaveBeenCalledWith("agent", { supabase: {} });
    expect(mocks.ensure).toHaveBeenCalledOnce();
  },
);

it.each(["finished", "error", "aborted"])(
  "submits a chat when a legacy %s task has no parameters",
  async (state) => {
    const queue = new Doc(),
      chat = new Doc();
    mocks.docs = [queue, chat];
    getTaskQueue(queue).tasks.push([
      {
        id: "legacy",
        type: "chat",
        state,
        requiredCapabilities: [],
        content: { agentId: "agent", activityId: "activity" },
      } as any,
    ]);
    await submitCurrentMessage({ activityId: "activity", agentId: "agent" });
    expect(chat.getMap("state").get("type")).toBe("queued");
    expect(getTaskQueue(queue).tasks.toArray()).toHaveLength(2);
  },
);

it("still blocks an active matching task after a legacy task", async () => {
  const { queue, chat } = cancellationFixture();
  chat.getMap("state").set("type", "idle");
  getTaskQueue(queue).tasks.insert(0, [
    {
      id: "legacy",
      type: "chat",
      state: "error",
      requiredCapabilities: [],
      content: {},
    } as any,
  ]);
  mocks.docs = [queue, chat];
  await expect(
    submitCurrentMessage({ activityId: "activity", agentId: "agent" }),
  ).rejects.toThrow("CHAT_BUSY");
  expect(getTaskQueue(queue).tasks.length).toBe(2);
});

it("ignores legacy tasks when stopping an already completed chat", async () => {
  const { queue, chat, activities } = cancellationFixture("finished");
  getTaskQueue(queue).tasks.insert(0, [
    {
      id: "legacy",
      type: "chat",
      state: "error",
      requiredCapabilities: [],
      content: {},
    } as any,
  ]);
  await abortChatGeneration({ activityId: "activity", agentId: "agent" });
  expect(chat.getMap("state").get("type")).toBe("idle");
  expect(getActivities(activities).activities.get("activity")?.state).toBe(
    "success",
  );
  expect(getTaskQueue(queue).abortRequests.size).toBe(0);
});

it("tolerates a legacy task arriving while waiting for cancellation", async () => {
  const { queue, chat } = cancellationFixture();
  getTaskQueue(queue).abortRequests.observe(() =>
    queueMicrotask(() => {
      getTaskQueue(queue).tasks.push([
        {
          id: "legacy",
          type: "chat",
          state: "error",
          requiredCapabilities: [],
          content: {},
        } as any,
      ]);
      acknowledgeAbort(queue, "old");
    }),
  );
  await abortChatGeneration({ activityId: "activity", agentId: "agent" });
  expect(chat.getMap("state").get("type")).toBe("idle");
  expect(chat.getMap("cancellations").size).toBe(0);
});

it("does not claim an activity for a forged user or an inaccessible agent", async () => {
  await expect(
    ensureActivity("other-user", {
      type: "activity",
      activityId: "activity",
      agentId: "agent",
    }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  mocks.workspace.mockResolvedValue(undefined);
  await expect(
    ensureActivity("user", {
      type: "activity",
      activityId: "activity",
      agentId: "agent",
    }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(mocks.ensure).not.toHaveBeenCalled();
  expect(mocks.sync).not.toHaveBeenCalled();
});
it("refuses a parent document owned by somebody else before submitting a task", async () => {
  mocks.ensure.mockRejectedValue(new Error("NOT_AUTHORIZED"));
  mocks.docs = [new Doc()];
  await expect(
    submitCurrentMessage({ activityId: "someone-elses", agentId: "agent" }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(mocks.sync).not.toHaveBeenCalled();
});
it("claims a parent without publishing activity metadata during initial page rendering", async () => {
  await ensureActivity(
    "user",
    { type: "activity", activityId: "activity", agentId: "agent" },
    { publishActivity: false },
  );
  expect(mocks.ensure).toHaveBeenCalled();
  expect(mocks.sync).not.toHaveBeenCalled();
});

// Simulate the coordinator acknowledgement at the action's document seam.
function acknowledgeAbort(document: Doc, id: string) {
  const task = getTaskQueue(document)
    .tasks.toArray()
    .find((task) => task.id === id)!;
  replaceTask(document, {
    ...task,
    state: "aborted",
    abortingAtISO: new Date().toISOString(),
    abortedAtISO: new Date().toISOString(),
  });
}
