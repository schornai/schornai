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
  realUIStream: false,
  model: vi.fn(),
  tools: vi.fn(),
  approval: vi.fn(),
  convert: vi.fn(),
  sync: vi.fn(),
  repositories: vi.fn(),
  storageAccess: vi.fn(),
  roles: [] as any[],
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
    roles: mocks.roles,
    modelIdentifier: "default",
    modelThinking: "optional-on",
  }),
}));
vi.mock(
  "@schornio/aibox-database/documentRepositories/getDocumentRepositories",
  () => ({ getDocumentRepositories: mocks.repositories }),
);
vi.mock("@schornio/aibox-database/storage/requireStorageAccess", () => ({
  requireStorageAccess: mocks.storageAccess,
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
  readUIMessageStream: async function* (options: any) {
    if (mocks.realUIStream) {
      const actual = await importOriginal<any>();
      yield* actual.readUIMessageStream(options);
      return;
    }
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
    retry: false,
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
  task.parameters.retry = false;
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
  mocks.realUIStream = false;
  mocks.sync.mockResolvedValue(undefined);
  mocks.roles = [
    {
      id: "role",
      name: "Writer",
      prompt: "Write",
      modelIdentifierOverride: "override",
      documentRepositoryMounts: [],
    },
  ];
  mocks.repositories.mockResolvedValue([]);
  mocks.storageAccess.mockResolvedValue(undefined);
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
  it("does not let a stale retry overwrite a newer generation", async () => {
    task.parameters.retry = true;
    chat.getMap("state").set("generationId", "newer-generation");
    chat.getMap("state").set("type", "queued");
    await run();
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(chat.getMap("state").get("generationId")).toBe("newer-generation");
    expect(chat.getMap("state").get("type")).toBe("queued");
  });
  it("retries stored history without duplicating the user message or consuming queued drafts", async () => {
    task.parameters.retry = true;
    const original = {
      id: "original",
      role: "user",
      parts: [{ type: "text", text: "Question" }],
    };
    chat.getArray("messages").push([original]);
    queue({ type: "text", text: "Do not send this draft" });
    const before = getChatCurrentMessageBatch(current).toArray();
    await run();
    expect(mocks.convert).toHaveBeenCalledWith([original]);
    expect(mocks.stream).toHaveBeenCalledTimes(1);
    expect(
      getChat(chat)
        .messages?.toArray()
        .filter((message) => message.role === "user"),
    ).toEqual([original]);
    expect(getChatCurrentMessageBatch(current).toArray()).toEqual(before);
    expect(chat.getMap("state").get("type")).toBe("idle");
  });
  it("repairs interrupted historical input before continuing, without replaying its reasoning", async () => {
    chat.getArray("messages").push([
      {
        id: "old",
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "reasoning",
            text: "",
            state: "done",
            providerMetadata: { openai: { itemId: "rs_missing" } },
          },
          {
            type: "tool-platform_agent_create",
            toolCallId: "create",
            state: "input-streaming",
            input: { agent: { name: "Demo" } },
          },
        ],
      },
    ]);
    queue({ type: "text", text: "weiter" });
    await run();
    const history = mocks.convert.mock.calls[0][0];
    expect(history[0].parts).toEqual([
      { type: "step-start" },
      expect.objectContaining({ state: "output-error" }),
    ]);
    expect(getChat(chat).messages?.toArray()[0]).toEqual(history[0]);
    expect(chat.getMap("state").get("type")).toBe("idle");
  });

  it("marks a silently truncated stream as an error instead of leaving the tool running", async () => {
    mocks.messages = [
      {
        id: "partial",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "",
            state: "done",
            providerMetadata: { openai: { itemId: "rs_missing" } },
          },
          {
            type: "tool-platform_agent_create",
            toolCallId: "create",
            state: "input-streaming",
            input: { agent: { name: "Demo" } },
          },
        ],
      },
    ];
    queue({ type: "text", text: "create demo" });
    await expect(run()).rejects.toThrow("TOOL_INPUT_INTERRUPTED");
    expect(getChat(chat).messages?.toArray().at(-1)?.parts).toEqual([
      expect.objectContaining({ state: "output-error" }),
    ]);
    expect(chat.getMap("state").get("type")).toBe("error");
  });

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

it.each(["allowed", "unmounted", "denied", "local"])(
  "resolves attachment references only through current mounts and read access (%s)",
  async (mode) => {
    const storage = {
      type: "documentRepository",
      workspaceId: "workspace",
      documentRepositoryId: "repo",
    };
    const attachment =
      mode === "local" ? undefined : { storage, agentPath: "docs/file.txt" };
    mocks.repositories.mockResolvedValue([
      {
        id: "repo",
        workspaceId: "workspace",
        identifier: "docs",
        name: "Documents",
      },
    ]);
    if (mode !== "unmounted")
      mocks.roles[0].documentRepositoryMounts = [
        {
          mount: "docs",
          pathRepository: "",
          documentRepositoryIdentifier: "docs",
          permission: "read",
        },
      ];
    if (mode === "denied")
      mocks.storageAccess.mockRejectedValue(new Error("access revoked"));
    queue({
      type: "text",
      text: "Read file",
      files: [
        {
          file: true,
          path: "file.txt",
          name: "file.txt",
          type: "text/plain",
          attachment,
        },
      ],
    });
    let reference: any;
    mocks.load.mockImplementation(async (messages, _session, options) => {
      reference = await options.resolveReference({
        url: "file.txt",
        name: "file.txt",
        attachment,
      });
      return messages;
    });
    await run();
    if (mode === "allowed") {
      expect(reference.agentPath).toBe("docs/file.txt");
      expect(reference.storageSession.storage).toEqual(storage);
    } else expect(reference).toBeUndefined();
    expect(mocks.storageAccess).toHaveBeenCalledTimes(
      ["allowed", "denied"].includes(mode) ? 1 : 0,
    );
    if (mode === "allowed")
      expect(mocks.storageAccess).toHaveBeenCalledWith(
        storage,
        "read",
        expect.any(Object),
      );
    expect(mocks.repositories).toHaveBeenCalledTimes(mode === "local" ? 0 : 1);
  },
);

it("rejects approval resumption when its original agent role has been removed", async () => {
  getChat(chat).messages!.push([
    {
      id: "assistant",
      role: "assistant",
      metadata: { roleId: "removed-role" },
      parts: [
        {
          type: "tool-first",
          toolCallId: "call",
          state: "approval-requested",
          input: {},
          approval: { id: "approval" },
        },
      ],
    } as any,
  ]);
  queue({ type: "tool-approval", approvalId: "approval", approved: true });
  await expect(run()).rejects.toThrow("Agent role no longer available");
  expect(mocks.stream).not.toHaveBeenCalled();
  expect(mocks.select).not.toHaveBeenCalled();
  expect(activity()?.state).toBe("error");
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

it.each(["lease-lost", "new-generation"])(
  "ignores a late model result after %s",
  async (reason) => {
    queue({ type: "text", text: "First" });
    queue({ type: "text", text: "Waiting" });
    const controller = new AbortController();
    mocks.stream.mockImplementationOnce(async () => {
      if (reason === "lease-lost")
        controller.abort(new Error("TASK_LEASE_LOST"));
      else {
        chat.getMap("state").set("generationId", "new-generation");
        chat.getMap("state").set("type", "queued");
      }
      return {
        stream: {},
        usage: Promise.resolve({ inputTokens: 1, outputTokens: 1 }),
      };
    });
    await run(controller.signal);
    expect(
      getChat(chat)
        .messages!.toArray()
        .some((message) => message.id === "answer"),
    ).toBe(false);
    expect(getChatCurrentMessageBatch(current).length).toBe(1);
    expect(getChat(chat).state!.get("type")).toBe(
      reason === "new-generation" ? "queued" : "generating",
    );
    if (reason === "new-generation")
      expect(getChat(chat).state!.get("generationId")).toBe("new-generation");
  },
);

it("resumes approved platform tools from immutable stored messages through the real SDK stream", async () => {
  mocks.realUIStream = true;
  chat.getArray("messages").push([
    {
      id: "tool-request",
      role: "assistant",
      metadata: { roleId: "role" },
      parts: [
        {
          type: "tool-platform_repository_create",
          toolCallId: "create",
          state: "approval-requested",
          input: { repository: { name: "Demo" } },
          approval: { id: "approval" },
        },
      ],
    },
  ]);
  queue({ type: "tool-approval", approvalId: "approval", approved: true });
  let saved: any;
  mocks.stream.mockImplementationOnce(async () => {
    saved = chat.getArray<any>("messages").get(0);
    const freeze = (value: any) => {
      if (value && typeof value === "object") {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
      }
    };
    freeze(saved);
    return {
      usage: Promise.resolve({ inputTokens: 1, outputTokens: 1 }),
      stream: new ReadableStream({
        start(controller) {
          for (const chunk of [
            { type: "start", messageId: "tool-request" },
            {
              type: "tool-output-available",
              toolCallId: "create",
              output: { documentRepositoryId: "created" },
            },
            { type: "text-start", id: "text" },
            { type: "text-delta", id: "text", delta: "Created" },
            { type: "text-end", id: "text" },
            { type: "finish" },
          ])
            controller.enqueue(chunk);
          controller.close();
        },
      }),
    };
  });
  await run();
  expect(getChat(chat).state?.get("type")).toBe("idle");
  expect(getChat(chat).messages?.toArray().at(-1)?.parts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "tool-platform_repository_create",
        state: "output-available",
        output: { documentRepositoryId: "created" },
      }),
      expect.objectContaining({ type: "text", text: "Created" }),
    ]),
  );
  expect(saved.parts[0].state).toBe("approval-responded");
});
