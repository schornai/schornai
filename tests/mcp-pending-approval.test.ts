import { beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  docs: new Map<string, any>(),
  user: { id: "alice" } as { id: string } | null,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  }),
}));
vi.mock(
  "@schornio/aibox-package-database/realtime/getRealtimeDocumentPermission",
  () => ({ getRealtimeDocumentPermission: mocks.permission }),
);
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: async () => "admin",
}));
vi.mock("@schornio/aibox-realtime/server/getRealtimeServerToken", () => ({
  getRealtimeServerToken: () => "server",
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document: any;
    constructor({ documentName }: { documentName: string }) {
      this.document = mocks.docs.get(documentName);
      if (!this.document) throw new Error("Unexpected document");
    }
    async waitForSynced() {}
    async [Symbol.asyncDispose]() {}
  },
}));
vi.mock("@schornio/aibox-package-database/agent/getAgentWorkspaceId", () => ({
  getAgentWorkspaceId: async () => "workspace",
}));
import { pendingMCPApproval } from "../apps/web/lib/mcp/pendingApproval";
const context = {
  agentId: "agent",
  activityId: "activity",
  approvalId: "approval",
  mcpId: "trello",
};
let chat: Doc;
beforeEach(() => {
  mocks.user = { id: "alice" };
  mocks.permission.mockReset().mockResolvedValue("read");
  mocks.docs.clear();
  chat = new Doc();
  chat.getArray("messages").push([
    {
      id: "assistant",
      role: "assistant",
      parts: [
        {
          type: "tool-mcp",
          toolCallId: "call",
          state: "approval-requested",
          input: { serverId: "trello" },
          approval: { id: "approval" },
        },
      ],
    },
  ]);
  mocks.docs.set("activity_chat___activity_agent", chat);
  mocks.docs.set("activity_chat_currentMessage___activity_agent", new Doc());
  mocks.docs.set("taskQueue", new Doc());
});
it("only validates until OAuth completes", async () => {
  await pendingMCPApproval(context);
  expect(mocks.docs.get("taskQueue").getArray("tasks").length).toBe(0);
  expect(
    mocks.docs
      .get("activity_chat_currentMessage___activity_agent")
      .getArray("batch").length,
  ).toBe(0);
});
it("rejects another user's chat before opening privileged realtime documents", async () => {
  mocks.permission.mockResolvedValue(undefined);
  mocks.docs.clear();
  await expect(pendingMCPApproval(context, true)).rejects.toThrow(
    "Chat unavailable",
  );
});
it.each([{ approvalId: "other" }, { mcpId: "other" }])(
  "rejects a mismatched pending approval %j",
  async (change) => {
    await expect(
      pendingMCPApproval({ ...context, ...change }, true),
    ).rejects.toThrow("Approval no longer pending");
  },
);
it("submits the exact approval and queues automatic continuation once", async () => {
  await pendingMCPApproval(context, true);
  const batch = mocks.docs
    .get("activity_chat_currentMessage___activity_agent")
    .getArray("batch")
    .toArray();
  expect(batch).toEqual([
    expect.objectContaining({
      state: "submitted",
      content: {
        type: "tool-approval",
        approvalId: "approval",
        approved: true,
      },
    }),
  ]);
  const tasks = mocks.docs.get("taskQueue").getArray("tasks").toArray();
  expect(tasks).toEqual([
    expect.objectContaining({
      type: "chat",
      state: "pending",
      parameters: expect.objectContaining({
        userId: "alice",
        agentId: "agent",
        activityId: "activity",
      }),
    }),
  ]);
  await expect(pendingMCPApproval(context, true)).rejects.toThrow("CHAT_BUSY");
  expect(mocks.docs.get("taskQueue").getArray("tasks").length).toBe(1);
});
it("does not resume after cancellation", async () => {
  chat.getMap("cancellations").set("request", true);
  await expect(pendingMCPApproval(context, true)).rejects.toThrow("CHAT_BUSY");
});
