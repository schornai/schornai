import { Doc } from "yjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatWorker } from "../apps/realtime/src/chat/worker";
import { getChatCurrentMessageBatch } from "../packages/realtime/src/documents/chatCurrentMessage/getChatCurrentMessageBatch";
import { getChat } from "../packages/realtime/src/documents/chat/getChat";
import { getActivities } from "../packages/realtime/src/documents/activity/getActivities";
const mocks = vi.hoisted(() => ({
  handler: undefined as any,
  docs: [] as any[],
  activityDocs: [] as any[],
  stream: vi.fn(),
  dispose: vi.fn(),
  load: vi.fn(),
  select: vi.fn(),
  messages: [] as any[],
  streamError: undefined as any,
  model: vi.fn(),
  tools: vi.fn(),
  approval: vi.fn(),
  convert: vi.fn(),
  sync: vi.fn(),
}));
vi.mock("@schornio/aibox-realtime/documents/taskQueue/TaskQueue", () => ({
  TaskQueue: class {
    handleTask(handler: any) {
      mocks.handler = handler;
      return Promise.resolve();
    }
  },
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = mocks.docs.shift();
    static getServerToken(token: string) {
      return token;
    }
    waitForSynced = mocks.sync;
    [Symbol.asyncDispose]() {
      mocks.dispose();
      return Promise.resolve();
    }
  },
  ServerBatchRealtimeProvider: class {
    documents = mocks.activityDocs;
    batch(fn: any, ...args: any[]) {
      this.documents.forEach((doc) => fn(doc, ...args));
    }
    waitForSynced = mocks.sync;
    [Symbol.asyncDispose]() {
      mocks.dispose();
      return Promise.resolve();
    }
  },
}));
vi.mock("@schornio/aibox-database/auth/createClientWithClaims", () => ({
  createClientWithClaims: async () => ({ storage: { from: () => ({}) } }),
}));
vi.mock(
  "@schornio/aibox-realtime/_lib/getAllowedUserIdsByDocumentName",
  () => ({ getAllowedUserIdsByDocumentName: async () => ["user"] }),
);
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: async () => ({
    id: "agent",
    roles: [
      {
        id: "role",
        name: "Writer",
        prompt: "Write",
        modelIdentifierOverride: "override",
      },
    ],
    modelIdentifier: "default",
    modelThinking: "optional-on",
  }),
}));
vi.mock("@schornio/aibox-database/chat/loadMessageFiles", () => ({
  loadMessageFiles: mocks.load,
}));
vi.mock("../apps/realtime/src/chat/selectRole", () => ({
  selectRole: mocks.select,
}));
vi.mock("@schornio/aibox-realtime/_lib/aiboxModel", () => ({
  aiboxModel: mocks.model,
}));
vi.mock("../apps/realtime/src/chat/AgentToolSession", () => ({
  AgentToolSession: class {
    tools = mocks.tools;
    toolApproval = mocks.approval;
    [Symbol.asyncDispose]() {
      mocks.dispose();
      return Promise.resolve();
    }
  },
}));
vi.mock("ai-sdk-ollama", () => ({ streamText: mocks.stream }));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  convertToModelMessages: mocks.convert,
  toUIMessageStream: (value: any) => {
    value.generateMessageId();
    return value.stream;
  },
  readUIMessageStream: async function* () {
    if (mocks.streamError) throw mocks.streamError;
    for (const message of mocks.messages) yield message;
  },
}));
let chat: Doc, current: Doc, activities: Doc;
const task = {
  id: "generation",
  claimedAtISO: "2026-01-01",
  parameters: {
    activityId: "activity",
    agentId: "agent",
    userId: "user",
    userClaims: [],
  },
};
function queue(content: any) {
  getChatCurrentMessageBatch(current).push([
    { id: crypto.randomUUID(), state: "queued", content },
  ]);
}
function run(abortSignal = new AbortController().signal) {
  chatWorker({
    supabaseServiceRole: {} as any,
    token: "token",
    workerIdentifier: "worker",
  });
  return mocks.handler(task, abortSignal);
}
function activity() {
  return getActivities(activities).activities?.get("activity");
}
beforeEach(() => {
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockReset();
  chat = new Doc();
  current = new Doc();
  activities = new Doc();
  mocks.docs = [chat, current];
  mocks.activityDocs = [activities];
  mocks.messages = [
    {
      id: "answer",
      role: "assistant",
      parts: [{ type: "text", text: "Answer" }],
    },
  ];
  mocks.streamError = undefined;
  mocks.sync.mockResolvedValue(undefined);
  mocks.load.mockImplementation(async (messages) => messages);
  mocks.convert.mockImplementation(async (messages) => messages);
  mocks.select.mockResolvedValue({
    id: "role",
    name: "Writer",
    prompt: "Write",
    modelIdentifierOverride: "override",
  });
  mocks.model.mockImplementation((id) => ({ id }));
  mocks.tools.mockResolvedValue({});
  mocks.approval.mockResolvedValue({});
  mocks.stream.mockResolvedValue({
    stream: {},
    usage: Promise.resolve({ inputTokens: 10, outputTokens: 5 }),
  });
});
describe("chat worker orchestration", () => {
  it("turns queued text and attachments into messages and publishes usage and activity state", async () => {
    queue({
      type: "text",
      text: "Question",
      thinking: true,
      files: [
        { path: "a.txt", name: "a.txt", file: true, type: "text/plain" },
        { path: "folder", name: "Folder", folder: true },
      ],
    });
    await run();
    const messages = getChat(chat).messages!.toArray();
    expect(messages[0]).toMatchObject({
      role: "user",
      parts: [
        { type: "text", text: "Question" },
        { type: "data-file", data: { type: "text/plain", url: "a.txt" } },
        { type: "data-file", data: { type: "application/octet-stream" } },
      ],
    });
    expect(messages[1]).toMatchObject({
      metadata: {
        roleId: "role",
        roleName: "Writer",
        thinking: true,
        usage: { inputTokens: 10, outputTokens: 5 },
      },
    });
    expect(mocks.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: "Write",
        model: { id: "override" },
      }),
    );
    expect(getChat(chat).state!.get("type")).toBe("idle");
    expect(activity()).toMatchObject({
      id: "activity",
      state: "success",
      label: "Question",
    });
    expect(mocks.dispose).toHaveBeenCalledTimes(4);
  });
  it("finishes an empty queue without contacting a model", async () => {
    await run();
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(activity()?.state).toBe("success");
    expect(mocks.dispose).toHaveBeenCalledTimes(3);
  });
  it("handles blank text, absent role overrides and streams without messages", async () => {
    queue({ type: "text" });
    mocks.messages = [];
    mocks.select.mockResolvedValue({ id: "role", prompt: "" });
    await run();
    expect(getChat(chat).messages!.toArray()[0].parts).toEqual([
      { type: "text", text: "" },
    ]);
    expect(mocks.stream.mock.lastCall![0].model).toEqual({ id: "default" });
    expect(activity()?.state).toBe("success");
  });
  it.each([
    new Error("remote failure"),
    "string failure",
    new DOMException("cancelled", "AbortError"),
  ])(
    "publishes model failure or cancellation %s and disposes all sessions",
    async (error) => {
      queue({ type: "text", text: "Question" });
      mocks.stream.mockRejectedValue(error);
      if ((error as any).name === "AbortError") {
        await run();
        expect(getChat(chat).state!.get("type")).toBe("idle");
        expect(activity()?.state).toBe("idle");
      } else {
        await expect(run()).rejects.toBe(error);
        expect(getChat(chat).state!.get("error")).toBe(
          error instanceof Error ? error.message : error,
        );
        expect(activity()?.state).toBe("error");
      }
      expect(mocks.dispose).toHaveBeenCalledTimes(4);
    },
  );
  it("propagates errors from the UI stream instead of reporting success", async () => {
    queue({ type: "text", text: "Question" });
    mocks.streamError = new Error("invalid stream");
    await expect(run()).rejects.toThrow("invalid stream");
    expect(activity()?.state).toBe("error");
  });
  it("waits for every tool approval before resuming generation", async () => {
    getChat(chat).messages!.push([
      {
        id: "assistant",
        role: "assistant",
        metadata: { thinking: true },
        parts: [
          {
            type: "tool-first",
            toolCallId: "first",
            state: "approval-requested",
            input: {},
            approval: { id: "a" },
          },
          {
            type: "tool-second",
            toolCallId: "second",
            state: "approval-requested",
            input: {},
            approval: { id: "b" },
          },
        ],
      } as any,
    ]);
    queue({ type: "tool-approval", approvalId: "a", approved: true });
    queue({ type: "tool-approval", approvalId: "b", approved: false });
    await run();
    expect(mocks.stream).toHaveBeenCalledOnce();
    expect(mocks.select.mock.lastCall![2].thinking).toBe(true);
    expect(getChat(chat).messages!.toArray()[0].parts).toMatchObject([
      { state: "approval-responded", approval: { approved: true } },
      { state: "approval-responded", approval: { approved: false } },
    ]);
  });
  it("keeps an activity idle when the generated response requests tool approval", async () => {
    queue({ type: "text", text: "Question" });
    mocks.messages = [
      {
        id: "answer",
        role: "assistant",
        parts: [
          {
            type: "tool-first",
            toolCallId: "first",
            state: "approval-requested",
            input: {},
            approval: { id: "approval" },
          },
        ],
      },
    ];
    await run();
    expect(activity()?.state).toBe("idle");
  });
});

// The retired draft worker was removed; exercise cancellation on the live worker.
it("stops before claiming another queued draft and preserves the partial answer", async () => {
  queue({ type: "text", text: "First" });
  queue({ type: "text", text: "Next draft" });
  const controller = new AbortController();
  mocks.stream.mockImplementationOnce(async () => {
    controller.abort();
    return {
      stream: {},
      usage: Promise.resolve({ inputTokens: 1, outputTokens: 1 }),
    };
  });
  await run(controller.signal);
  expect(mocks.stream).toHaveBeenCalledOnce();
  expect(getChatCurrentMessageBatch(current).length).toBe(1);
  expect(getChat(chat).messages?.toArray().at(-1)?.parts).toEqual([
    { type: "text", text: "Answer" },
  ]);
  expect(activity()?.state).toBe("running");
  expect(getChat(chat).state!.get("type")).toBe("aborting");
});

it("preserves the first draft when cancellation arrives during initial synchronization", async () => {
  queue({ type: "text", text: "Unprocessed" });
  const controller = new AbortController();
  mocks.sync.mockImplementationOnce(async () => {
    controller.abort();
  });
  await run(controller.signal);
  expect(getChatCurrentMessageBatch(current).length).toBe(1);
  expect(getChat(chat).messages!.length).toBe(0);
  expect(mocks.stream).not.toHaveBeenCalled();
});

it("preserves approval responses when cancelled while flushing an earlier response", async () => {
  getChat(chat).messages!.push([
    {
      id: "assistant",
      role: "assistant",
      parts: ["a", "b"].map((id) => ({
        type: "tool-first",
        toolCallId: id,
        state: "approval-requested",
        input: {},
        approval: { id },
      })),
    } as any,
  ]);
  queue({ type: "tool-approval", approvalId: "a", approved: true });
  queue({ type: "tool-approval", approvalId: "b", approved: true });
  const controller = new AbortController();
  mocks.sync
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined)
    .mockImplementationOnce(async () => {
      controller.abort();
    });
  await run(controller.signal);
  expect(getChatCurrentMessageBatch(current).toArray()).toMatchObject([
    { content: { approvalId: "b" } },
  ]);
  expect(getChat(chat).messages!.get(0).parts).toMatchObject([
    { state: "approval-responded" },
    { state: "approval-requested" },
  ]);
  expect(mocks.stream).not.toHaveBeenCalled();
});

describe("chat worker approval continuation", () => {
  it("processes queued text and resumes after the generated tool request is approved", async () => {
    queue({ type: "text", text: "Question" });
    queue({ type: "tool-approval", approvalId: "approval", approved: true });
    const answer = mocks.messages;
    const request = {
      id: "tool-request",
      role: "assistant",
      parts: [
        {
          type: "tool-first",
          toolCallId: "first",
          state: "approval-requested",
          input: {},
          approval: { id: "approval" },
        },
      ],
    };
    const streamResult = () => ({
      stream: {},
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 5 }),
    });
    mocks.stream
      .mockImplementationOnce(async () => {
        mocks.messages = [request];
        return streamResult();
      })
      .mockImplementationOnce(async () => {
        mocks.messages = answer;
        return streamResult();
      });

    await run();

    expect(mocks.stream).toHaveBeenCalledTimes(2);
    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(mocks.stream.mock.lastCall![0].messages.at(-1)).toMatchObject({
      role: "assistant",
      parts: [
        {
          type: "tool-first",
          state: "approval-responded",
          approval: { id: "approval", approved: true },
        },
      ],
    });
    expect(getChatCurrentMessageBatch(current).toArray()).toEqual([]);
    expect(getChat(chat).messages!.toArray().at(-1)).toMatchObject(answer[0]);
    expect(activity()?.state).toBe("success");
  });
});
