import { beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { sendChatMessage } from "../packages/realtime/src/platform/sendChatMessage.ts";
import type { PlatformContext } from "../packages/realtime/src/platform/registry.ts";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue.ts";
import { getChatDocumentName } from "../packages/realtime/src/documents/chat/_utils.ts";

const io = vi.hoisted(() => ({
  docs: new Map<string, Doc>(),
  sync: vi.fn(),
  select: vi.fn(),
  ensure: vi.fn(),
}));
vi.mock(
  "../packages/realtime/src/documents/chat/queueChat.ts",
  async (original) => ({
    ...(await original<
      typeof import("../packages/realtime/src/documents/chat/queueChat")
    >()),
    queueChat: (await import("./helpers/chat-admission")).queueChatInMemory,
  }),
);
vi.mock(
  "../packages/realtime/src/server/ServerRealtimeProvider.ts",
  async () => {
    const { Doc } = await import("yjs");
    return {
      ServerRealtimeProvider: class {
        document: Doc;
        name: string;
        constructor({ documentName }: { documentName: string }) {
          this.name = documentName;
          if (!io.docs.has(documentName)) io.docs.set(documentName, new Doc());
          this.document = io.docs.get(documentName)!;
        }
        async waitForSynced(options?: { abortSignal: AbortSignal }) {
          await io.sync(this.name, this.document);
          options?.abortSignal.throwIfAborted();
        }
        async [Symbol.asyncDispose]() {}
      },
    };
  },
);
vi.mock("../packages/realtime/src/documents/storage/selectChatFile.ts", () => ({
  selectChatFile: io.select,
}));
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: async () => ({ workspaceId: "workspace" }),
}));
vi.mock("@schornio/aibox-database/realtime/ensureRealtimeDocument", () => ({
  ensureRealtimeDocument: io.ensure,
}));
const input = {
  agentId: "agent",
  newActivityId: "activity",
  text: "Run saved message",
};
const context = {
  userId: "owner",
  claims: [{ organization_id: "workspace", role: "editor" }],
  level: "editor",
  supabase: {},
  supabaseServiceRole: {},
  serverToken: "Worker test",
  websocketProvider: {},
} as PlatformContext;
beforeEach(() => {
  vi.resetAllMocks();
  for (const doc of io.docs.values()) doc.destroy();
  io.docs.clear();
});
function tasks() {
  return getTaskQueue(io.docs.get("taskQueue")!).tasks.toArray();
}

it("queues an authorized automation normally", async () => {
  const controller = new AbortController();
  await sendChatMessage(input, { ...context, abortSignal: controller.signal });
  expect(tasks()).toHaveLength(1);
  expect(tasks()[0]).toMatchObject({
    parameters: { userId: "owner", userClaims: context.claims },
  });
});

it("does not create a chat when its scheduler lease has already been lost", async () => {
  const controller = new AbortController();
  controller.abort(new Error("LEASE_LOST"));
  await expect(
    sendChatMessage(input, { ...context, abortSignal: controller.signal }),
  ).rejects.toThrow("LEASE_LOST");
  expect(io.ensure).not.toHaveBeenCalled();
  expect(io.docs.size).toBe(0);
});

it("does not queue after lease loss during attachment selection", async () => {
  const controller = new AbortController();
  io.select.mockImplementation(async () => {
    controller.abort(new Error("LEASE_LOST"));
    return { file: { name: "file.txt", file: true } };
  });
  await expect(
    sendChatMessage(
      {
        ...input,
        files: [
          {
            storage: {
              type: "documentRepository",
              workspaceId: "workspace",
              documentRepositoryId: "repository",
            },
            path: "file.txt",
          },
        ],
      },
      { ...context, abortSignal: controller.signal },
    ),
  ).rejects.toThrow("LEASE_LOST");
  expect(io.select).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ abortSignal: controller.signal }),
  );
  expect(tasks()).toEqual([]);
});

it("does not publish the chat task if the lease is lost before admission", async () => {
  const controller = new AbortController();
  const name = getChatDocumentName({
    agentId: input.agentId,
    activityId: input.newActivityId,
  });
  let chatSyncs = 0;
  io.sync.mockImplementation(async (documentName) => {
    if (documentName === name && ++chatSyncs === 2)
      controller.abort(new Error("LEASE_LOST"));
  });
  await expect(
    sendChatMessage(input, { ...context, abortSignal: controller.signal }),
  ).rejects.toThrow("LEASE_LOST");
  expect(tasks()).toEqual([]);
  expect(io.docs.get(name)!.getMap("state").has("generationId")).toBe(false);
});
