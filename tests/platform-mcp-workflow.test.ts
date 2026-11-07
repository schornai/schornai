import { beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
const state = vi.hoisted(() => ({
  docs: new Map<string, any>(),
  permission: true,
}));
vi.mock(
  "../packages/realtime/src/server/ServerRealtimeProvider.ts",
  async () => {
    const { Doc } = await import("yjs");
    class Provider {
      document: any;
      constructor({ documentName }: { documentName: string }) {
        if (!state.docs.has(documentName))
          state.docs.set(documentName, new Doc());
        this.document = state.docs.get(documentName);
      }
      async waitForSynced() {}
      async [Symbol.asyncDispose]() {}
    }
    return {
      ServerRealtimeProvider: Provider,
      ServerBatchRealtimeProvider: Provider,
    };
  },
);
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: async () => ({ workspaceId: "workspace" }),
}));
vi.mock(
  "@schornio/aibox-database/realtime/getRealtimeDocumentPermission",
  () => ({
    getRealtimeDocumentPermission: async () =>
      state.permission ? "read" : undefined,
  }),
);
vi.mock("@schornio/aibox-database/workspace/getWorkspaces", () => ({
  getWorkspaces: async () => [{ id: "workspace" }],
}));
import { addWorkflowTools } from "../packages/realtime/src/platform/workflowTools.ts";
import {
  platformRegistry,
  type PlatformContext,
} from "../packages/realtime/src/platform/registry.ts";
import { getChatDocumentName } from "../packages/realtime/src/documents/chat/_utils.ts";
import { getChatCurrentMessageDocumentName } from "../packages/realtime/src/documents/chatCurrentMessage/_utils.ts";
import { getChatCurrentMessageBatch } from "../packages/realtime/src/documents/chatCurrentMessage/getChatCurrentMessageBatch.ts";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue.ts";
const input = {
  agentId: "agent",
  activityId: "11111111-1111-4111-8111-111111111111",
};
const chatName = getChatDocumentName(input),
  draftName = getChatCurrentMessageDocumentName(input);
function tool(name: string) {
  const c = {
    userId: "user",
    level: "user",
    claims: "admin",
    supabase: {},
    supabaseServiceRole: {},
    serverToken: "Worker test",
    websocketProvider: {},
  } as PlatformContext;
  const r = platformRegistry(c);
  addWorkflowTools(c, r);
  return r.tools.find((t) => t.name === name)!;
}
beforeEach(() => {
  for (const doc of state.docs.values()) doc.destroy();
  state.docs.clear();
  state.permission = true;
  state.docs.set(chatName, new Doc());
  state.docs.set(draftName, new Doc());
});
describe("platform chat workflow", () => {
  it("edits paused drafts, queues the batch and caps delegated administrator rights", async () => {
    const result = (await tool("platform_chat_draft_update").execute({
      ...input,
      text: "First",
    })) as { messageId: string };
    await tool("platform_chat_draft_update").execute({
      ...input,
      messageId: result.messageId,
      text: "Revised",
      thinking: true,
    });
    expect(
      getChatCurrentMessageBatch(state.docs.get(draftName)).toArray()[0],
    ).toMatchObject({
      state: "paused",
      content: { text: "Revised", thinking: true },
    });
    await tool("platform_chat_submit_batch").execute(input);
    expect(
      getChatCurrentMessageBatch(state.docs.get(draftName)).toArray()[0],
    ).toMatchObject({ state: "submitted" });
    expect(
      getTaskQueue(state.docs.get("taskQueue")).tasks.toArray()[0],
    ).toMatchObject({
      state: "pending",
      parameters: {
        userClaims: [{ organization_id: "workspace", role: "user" }],
      },
    });
    await expect(
      tool("platform_chat_submit_batch").execute(input),
    ).rejects.toThrow("CHAT_BUSY");
  });
  it("rejects access to another chat before opening its draft or queue", async () => {
    state.permission = false;
    await expect(
      tool("platform_chat_draft_update").execute({
        ...input,
        text: "Injected",
      }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(getChatCurrentMessageBatch(state.docs.get(draftName)).length).toBe(
      0,
    );
    expect(state.docs.has("taskQueue")).toBe(false);
  });
  it("only accepts the exact pending approval and cannot double-submit it", async () => {
    state.docs
      .get(chatName)
      .getArray("messages")
      .push([
        {
          id: "reply",
          role: "assistant",
          parts: [
            {
              type: "tool-platform_file_write",
              toolCallId: "call",
              input: {},
              state: "approval-requested",
              approval: { id: "pending" },
            },
          ],
        },
      ]);
    await expect(
      tool("platform_chat_tool_approval").execute({
        ...input,
        approvalId: "stale",
        approved: true,
      }),
    ).rejects.toThrow("APPROVAL_NOT_PENDING");
    expect(getChatCurrentMessageBatch(state.docs.get(draftName)).length).toBe(
      0,
    );
    await tool("platform_chat_tool_approval").execute({
      ...input,
      approvalId: "pending",
      approved: false,
    });
    expect(
      getChatCurrentMessageBatch(state.docs.get(draftName)).toArray()[0],
    ).toMatchObject({
      state: "submitted",
      content: {
        type: "tool-approval",
        approvalId: "pending",
        approved: false,
      },
    });
    await expect(
      tool("platform_chat_tool_approval").execute({
        ...input,
        approvalId: "pending",
        approved: true,
      }),
    ).rejects.toThrow("CHAT_BUSY");
  });
});
