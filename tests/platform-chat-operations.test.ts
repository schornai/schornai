import { beforeEach, describe, expect, it, vi } from "vitest";
const io = vi.hoisted(() => ({
  docs: new Map<string, any>(),
  permission: vi.fn(),
  ensure: vi.fn(),
  select: vi.fn(),
  abort: vi.fn(),
  remove: vi.fn(),
  users: vi.fn(),
  profile: vi.fn(),
  admin: vi.fn(),
  memberships: vi.fn(),
}));
vi.mock(
  "../packages/realtime/src/server/ServerRealtimeProvider.ts",
  async () => {
    const { Doc } = await import("yjs");
    return {
      ServerRealtimeProvider: class {
        document: any;
        constructor({ documentName }: any) {
          if (!io.docs.has(documentName)) io.docs.set(documentName, new Doc());
          this.document = io.docs.get(documentName);
        }
        async waitForSynced() {}
        async [Symbol.asyncDispose]() {}
      },
    };
  },
);
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: async () => ({ workspaceId: "workspace" }),
}));
vi.mock("@schornio/aibox-database/transcriber/getTranscriberById", () => ({
  getTranscriberById: async () => ({ workspaceId: "workspace" }),
}));
vi.mock("@schornio/aibox-database/workspace/getWorkspaces", () => ({
  getWorkspaces: async () => [{ id: "workspace" }],
}));
vi.mock(
  "@schornio/aibox-database/realtime/getRealtimeDocumentPermission",
  () => ({ getRealtimeDocumentPermission: io.permission }),
);
vi.mock("@schornio/aibox-database/realtime/ensureRealtimeDocument", () => ({
  ensureRealtimeDocument: io.ensure,
}));
vi.mock(
  "../packages/realtime/src/documents/storage/selectChatFile.ts",
  async (original) => ({
    ...(await original<any>()),
    selectChatFile: io.select,
  }),
);
vi.mock(
  "../packages/realtime/src/documents/chat/abortChatGeneration.ts",
  () => ({ abortChatGeneration: io.abort }),
);
vi.mock(
  "../packages/realtime/src/documents/activity/removeActivityFromHistory.ts",
  () => ({ removeActivityFromHistory: io.remove }),
);
vi.mock("@schornio/aibox-database/user/getUsersWithWorkspaceClaim", () => ({
  getUsersWithWorkspaceClaim: io.users,
}));
vi.mock("@schornio/aibox-database/user/getUserById", () => ({
  getUserById: io.profile,
}));
vi.mock("@schornio/aibox-database/user/getUserIsAdmin", () => ({
  getUserIsAdmin: io.admin,
}));
vi.mock(
  "@schornio/aibox-database/workspace/getWorkspacesWithUserClaim",
  () => ({ getWorkspacesWithUserClaim: io.memberships }),
);
import {
  platformRegistry,
  type PlatformContext,
} from "../packages/realtime/src/platform/registry.ts";
import { addChatTools } from "../packages/realtime/src/platform/chatTools.ts";
import { addWorkflowTools } from "../packages/realtime/src/platform/workflowTools.ts";
import { addMonitoringTools } from "../packages/realtime/src/platform/monitoringTools.ts";
import { getChatDocumentName } from "../packages/realtime/src/documents/chat/_utils.ts";
import { getChatCurrentMessageDocumentName } from "../packages/realtime/src/documents/chatCurrentMessage/_utils.ts";
import { getChatCurrentMessageBatch } from "../packages/realtime/src/documents/chatCurrentMessage/getChatCurrentMessageBatch.ts";
import { getActivitiesDocumentName } from "../packages/realtime/src/documents/activity/_utils.ts";
import { getActivities } from "../packages/realtime/src/documents/activity/getActivities.ts";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue.ts";
const userId = "11111111-1111-4111-8111-111111111111",
  activityId = "22222222-2222-4222-8222-222222222222",
  input = { agentId: "agent", activityId };
const storage = { type: "activity" as const, ...input };
const c: PlatformContext = {
  userId,
  level: "admin",
  claims: "admin",
  supabase: {} as any,
  supabaseServiceRole: {} as any,
  serverToken: "Worker test",
  websocketProvider: {} as any,
};
function execute(name: string, args: unknown = {}, context = c) {
  const r = platformRegistry(context);
  addChatTools(context, r);
  addWorkflowTools(context, r);
  addMonitoringTools(context, r);
  return r.tools.find((t) => t.name === name)!.execute(args) as Promise<any>;
}
const drafts = () =>
  getChatCurrentMessageBatch(
    io.docs.get(getChatCurrentMessageDocumentName(input)),
  );
beforeEach(() => {
  vi.clearAllMocks();
  io.docs.clear();
  io.permission.mockResolvedValue("read");
  io.select.mockResolvedValue({
    file: {
      file: true,
      name: "file.md",
      path: "file.md",
      type: "text/markdown",
      size: 1,
      createdAtISO: "",
      updatedAtISO: "",
    },
  });
});
describe("platform chat and monitoring integration", () => {
  it.each(["chat", "transcription"])(
    "creates a private %s activity and records its label",
    async (kind) => {
      const created = await execute("platform_activity_create", {
        kind,
        resourceId: "resource",
        label: "Research",
      });
      expect(created.storage.type).toBe(
        kind === "chat" ? "activity" : "activity-transcription",
      );
      expect(io.ensure).toHaveBeenCalledWith(
        expect.any(String),
        { userIds: [userId] },
        { supabase: c.supabaseServiceRole },
      );
      const activities = await execute("platform_activities_list");
      expect(activities).toEqual([
        expect.objectContaining({ id: created.activityId, label: "Research" }),
      ]);
    },
  );
  it.each(["chat", "transcription"])(
    "supplies the default %s label",
    async (kind) => {
      await execute("platform_activity_create", {
        kind,
        resourceId: "resource",
      });
      expect((await execute("platform_activities_list"))[0].label).toBe(
        kind === "chat" ? "Chat" : "Transkriptionen",
      );
    },
  );
  it("renames and pins only existing activities and delegates history deletion", async () => {
    await expect(
      execute("platform_activity_update", { activityId, label: "Missing" }),
    ).rejects.toThrow("NOT_FOUND");
    const created = await execute("platform_activity_create", {
      kind: "chat",
      resourceId: "agent",
    });
    await execute("platform_activity_update", {
      activityId: created.activityId,
      label: "Renamed",
      pinned: true,
    });
    await execute("platform_activity_update", {
      activityId: created.activityId,
    });
    expect((await execute("platform_activities_list"))[0]).toMatchObject({
      label: "Renamed",
      pinned: true,
      labelUserInput: true,
    });
    await execute("platform_activity_delete", {
      activityId: created.activityId,
    });
    expect(io.remove).toHaveBeenCalledWith(created.activityId, c);
  });
  it("sends a new chat with scoped claims and selected attachments, then exposes queued state", async () => {
    const result = await execute(
      "platform_chat_send",
      {
        agentId: "agent",
        text: "Read this",
        files: [{ storage, path: "file.md" }],
      },
      { ...c, level: "user" },
    );
    expect(result.status).toBe("queued");
    expect(io.ensure).toHaveBeenCalled();
    expect(io.select).toHaveBeenCalledWith(
      expect.objectContaining({ storage, path: "file.md" }),
      expect.anything(),
    );
    const tasks = getTaskQueue(io.docs.get("taskQueue")).tasks.toArray();
    expect(tasks[0]).toMatchObject({
      parameters: {
        userClaims: [{ organization_id: "workspace", role: "user" }],
      },
    });
    expect(
      await execute("platform_chat_read", {
        agentId: "agent",
        activityId: result.activityId,
      }),
    ).toMatchObject({ state: { type: "queued" } });
  });
  it("requires content, checks existing chat permissions and accepts file-only submissions", async () => {
    await expect(
      execute("platform_chat_send", { agentId: "agent", text: " " }),
    ).rejects.toThrow("MESSAGE_REQUIRED");
    io.permission.mockResolvedValue(undefined);
    await expect(
      execute("platform_chat_send", { ...input, text: "No" }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(io.ensure).not.toHaveBeenCalled();
    io.permission.mockResolvedValue("read");
    await execute("platform_chat_send", {
      ...input,
      text: "",
      files: [{ storage, path: "file.md" }],
    });
    expect(io.ensure).not.toHaveBeenCalled();
  });
  it("rejects unprocessed attachments before queueing", async () => {
    io.select.mockResolvedValue({});
    await expect(
      execute("platform_chat_send", {
        ...input,
        text: "File",
        files: [{ storage, path: "file.md" }],
      }),
    ).rejects.toThrow("FILE_NOT_PROCESSED");
    expect(getTaskQueue(io.docs.get("taskQueue")).tasks.toArray()).toHaveLength(
      0,
    );
  });
  it("authorizes aborts and forwards the authenticated context", async () => {
    expect(await execute("platform_chat_abort", input)).toMatchObject({
      status: "stopped",
    });
    expect(io.abort).toHaveBeenCalledWith(
      input,
      expect.objectContaining({ userId }),
    );
    io.permission.mockResolvedValue(undefined);
    await expect(execute("platform_chat_abort", input)).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
    expect(io.abort).toHaveBeenCalledTimes(1);
  });
  it("reads, attaches files to and removes paused drafts", async () => {
    const { messageId } = await execute("platform_chat_draft_update", {
      ...input,
      text: "Draft",
    });
    expect((await execute("platform_chat_drafts", input))[0]).toMatchObject({
      id: messageId,
      state: "paused",
    });
    await execute("platform_chat_file_select", {
      ...input,
      storage,
      path: "file.md",
    });
    await execute("platform_chat_draft_files", {
      ...input,
      messageId,
      files: [{ storage, path: "file.md" }],
    });
    expect(drafts().toArray()[0].content).toMatchObject({
      files: [expect.objectContaining({ name: "file.md" })],
    });
    await execute("platform_chat_draft_update", {
      ...input,
      messageId,
      remove: true,
    });
    expect(await execute("platform_chat_drafts", input)).toEqual([]);
    await expect(
      execute("platform_chat_draft_update", { ...input, remove: true }),
    ).rejects.toThrow("MESSAGE_REQUIRED");
  });
  it("refuses missing, non-text, queued and unprocessed draft attachments", async () => {
    await expect(
      execute("platform_chat_draft_files", {
        ...input,
        messageId: "missing",
        files: [],
      }),
    ).rejects.toThrow("DRAFT_NOT_EDITABLE");
    const { messageId } = await execute("platform_chat_draft_update", {
      ...input,
      text: "Draft",
    });
    io.select.mockResolvedValue({});
    await expect(
      execute("platform_chat_draft_files", {
        ...input,
        messageId,
        files: [{ storage, path: "file.md" }],
      }),
    ).rejects.toThrow("FILE_NOT_PROCESSED");
    drafts().push([
      {
        id: "approval",
        state: "paused",
        content: { type: "tool-approval", approvalId: "a", approved: true },
      },
    ]);
    await expect(
      execute("platform_chat_draft_files", {
        ...input,
        messageId: "approval",
        files: [],
      }),
    ).rejects.toThrow("DRAFT_NOT_EDITABLE");
    drafts().push([
      {
        id: "queued",
        state: "submitted",
        content: { type: "text", text: "Busy" },
      },
    ]);
    await expect(
      execute("platform_chat_draft_files", {
        ...input,
        messageId: "queued",
        files: [],
      }),
    ).rejects.toThrow("DRAFT_NOT_EDITABLE");
  });
  it("submits text drafts while leaving unrelated paused entries untouched", async () => {
    await execute("platform_chat_draft_update", { ...input, text: "Draft" });
    drafts().push([
      {
        id: "approval",
        state: "paused",
        content: { type: "tool-approval", approvalId: "a", approved: false },
      },
    ]);
    expect(await execute("platform_chat_submit_batch", input)).toEqual({
      status: "queued",
    });
    expect(drafts().toArray()[1].state).toBe("paused");
  });
  it("returns only task metadata and current permissions, never task credentials", async () => {
    expect(await execute("platform_tasks_list")).toEqual([]);
    getTaskQueue(io.docs.get("taskQueue")).tasks.push([
      {
        id: "task",
        type: "chat",
        state: "pending",
        parameters: { secret: "hidden" },
      },
    ] as any);
    expect(await execute("platform_tasks_list")).toEqual([
      { id: "task", type: "chat", state: "pending" },
    ]);
    expect(await execute("platform_permissions_get")).toEqual({
      claims: "admin",
      accessLevel: "admin",
    });
    expect(await execute("platform_services_status")).toEqual([]);
  });
  it("reads a user's memberships and admin status through protected shared operations", async () => {
    io.users.mockResolvedValue(["member"]);
    expect(
      await execute("platform_workspace_users", { workspaceId: "workspace" }),
    ).toEqual(["member"]);
    expect(io.users).toHaveBeenCalledWith("workspace", {
      supabaseServiceRole: c.supabaseServiceRole,
    });
    io.profile.mockResolvedValue({ id: userId });
    io.admin.mockResolvedValue(true);
    io.memberships.mockResolvedValue(["workspace"]);
    expect(await execute("platform_user_get", { userId })).toEqual({
      profile: { id: userId },
      isAdmin: true,
      workspaces: ["workspace"],
    });
  });
});
