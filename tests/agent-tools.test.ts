vi.mock(
  "@schornio/aibox-realtime/documents/storage/writeStorageFileText",
  () => ({ writeStorageFileText: state.write }),
);
vi.mock("@schornio/aibox-package-database/mcp/getMCPOAuthClient", () => ({
  getMCPOAuthClient: vi.fn(async () => null),
}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageListTool } from "../apps/realtime/src/chat/tools/documentRepository/storageList";
import { storageReadFiletTool } from "../apps/realtime/src/chat/tools/documentRepository/storageReadFile";
import {
  storageWriteFileTool,
  storageWriteFileToolApproval,
} from "../apps/realtime/src/chat/tools/documentRepository/storageWriteFile";
import { storageSearchTool } from "../apps/realtime/src/chat/tools/documentRepository/storageSearch";
import { AgentToolSession } from "../apps/realtime/src/chat/AgentToolSession";
vi.mock("@schornio/aibox-package-database/mcp/getMCPOAuthSession", () => ({
  getMCPOAuthSession: vi.fn(async () => null),
}));
const state = vi.hoisted(() => ({
  list: vi.fn(),
  inspect: vi.fn(),
  content: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  write: vi.fn(),
  search: vi.fn(),
  repos: vi.fn(),
  mcp: vi.fn(),
  disposed: vi.fn(),
  embedding: vi.fn(),
}));
vi.mock("@schornio/aibox-package-database/storage/list", () => ({
  list: state.list,
}));
vi.mock("@schornio/aibox-package-database/storage/inspect", () => ({
  inspect: state.inspect,
}));
vi.mock("@schornio/aibox-package-database/storage/getDocumentContent", () => ({
  getDocumentContent: state.content,
}));
vi.mock("@schornio/aibox-package-database/storage/createFile", () => ({
  createFile: state.create,
}));
vi.mock("@schornio/aibox-package-database/storage/saveDocumentContent", () => ({
  saveDocumentContent: state.save,
}));
vi.mock(
  "@schornio/aibox-package-database/documentRepositories/searchDocuments",
  () => ({ searchDocuments: state.search }),
);
vi.mock(
  "@schornio/aibox-package-database/documentRepositories/getDocumentRepositorityByIdentifiers",
  () => ({ getDocumentRepositorityByIdentifiers: state.repos }),
);
vi.mock("@ai-sdk/mcp", () => ({ createMCPClient: state.mcp }));
vi.mock(
  "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      options: any;
      constructor(options: any) {
        this.options = options;
      }
      [Symbol.asyncDispose] = state.disposed;
    },
  }),
);
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/_lib/aiboxModelEmbedding", () => ({
  aiboxModelEmbedding: state.embedding,
}));
const repo: any = {
  id: "repo-id",
  identifier: "knowledge",
  workspaceId: "workspace",
};
const mount: any = {
  documentRepositoryIdentifier: "knowledge",
  mount: "/docs",
  pathRepository: "/base",
  permission: "confirm-write",
};
const context: any = {
  supabase: { storage: { from: vi.fn(() => ({})) } },
  serverToken: "Worker tests",
  websocketProvider: {},
};
const options: any = {
  abortSignal: new AbortController().signal,
  messages: [],
};
const file: any = {
  file: true,
  name: "file.txt",
  path: "base/file.txt",
  size: 4,
  type: "text/plain",
};
const execute = (tool: any, input: any, extra = {}) =>
  tool.execute(tool.inputSchema.parse(input), { ...options, ...extra });
beforeEach(() => {
  Object.values(state).forEach((mock) => mock.mockReset());
  state.list.mockResolvedValue([file]);
  state.inspect.mockResolvedValue(file);
  state.content.mockResolvedValue({
    type: "mdc",
    current: "hello",
    versions: [],
  });
  state.create.mockResolvedValue(file);
  state.save.mockResolvedValue(true);
  state.write.mockResolvedValue({ status: "saved", file, indexQueued: true });
  state.repos.mockResolvedValue([repo]);
  state.disposed.mockResolvedValue(undefined);
  state.search.mockResolvedValue({
    documentsByKeywords: [],
    documentsBySemantic: [],
  });
});
describe("agent filesystem tools", () => {
  it("lists virtual root folders and rejects unmounted paths", async () => {
    const tool = storageListTool("activity", "agent", [mount], [repo], context);
    expect(await execute(tool, { path: "/" })).toMatchObject({
      ok: true,
      content: [
        { folder: true, name: "docs", path: "docs" },
        { name: "this_conversation", folder: true },
      ],
    });
    expect(await execute(tool, { path: "/unknown" })).toMatchObject({
      ok: false,
    });
    expect(state.list).not.toHaveBeenCalled();
  });
  it("maps mounted directories and handles failed or nested listing", async () => {
    const tool = storageListTool(
      "activity",
      "agent",
      [mount, { ...mount, mount: "/nested/deep" }],
      [repo],
      context,
    );
    const result = await execute(tool, { path: "/docs" });
    expect(result).toMatchObject({
      ok: true,
      content: [{ path: "docs/file.txt" }],
      storage: { documentRepositoryId: "repo-id" },
      storageParent: { path: "base" },
    });
    expect(state.list).toHaveBeenCalledWith("base", expect.anything());
    state.list.mockRejectedValue(new Error("not found"));
    expect(await execute(tool, { path: "/docs/missing" })).toMatchObject({
      ok: false,
    });
    expect(await execute(tool, { path: "/nested" })).toMatchObject({
      ok: true,
      content: [{ name: "deep" }],
    });
  });
  it("paginates file content and returns original mount paths with storage metadata", async () => {
    state.content.mockResolvedValue({
      type: "mdc",
      current: "x".repeat(20001),
    });
    const tool = storageReadFiletTool(
      "activity",
      "agent",
      [mount],
      [repo],
      context,
    );
    const result = await execute(tool, { path: "/docs/file.txt", offset: 1 });
    expect(result).toMatchObject({
      ok: true,
      file: { path: "docs/file.txt" },
      contentLength: 10000,
      totalLength: 20001,
      contentOffset: 1,
      storagePath: "base/file.txt",
    });
    expect(state.inspect).toHaveBeenCalledWith(
      "base/file.txt",
      expect.anything(),
    );
    state.content.mockResolvedValue({
      type: "transcript",
      segments: [{ segmentOverride: "spoken", words: [] }],
    });
    expect((await execute(tool, { path: "/docs/file.txt" })).content).toContain(
      "spoken",
    );
    state.content.mockResolvedValue(undefined);
    expect(await execute(tool, { path: "/docs/file.txt" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("unavailable"),
    });
    state.inspect.mockResolvedValue({ folder: true });
    expect(await execute(tool, { path: "/docs" })).toMatchObject({ ok: false });
    expect(await execute(tool, { path: "/missing" })).toMatchObject({
      ok: false,
    });
  });
  it("uses the shared authorized write flow for mounted files", async () => {
    const authenticatedUser = {
      userId: "worker-user",
      userClaims: "admin" as const,
    };
    const tool = storageWriteFileTool("activity", "agent", [mount], [repo], {
      ...context,
      authenticatedUser,
    });
    expect(
      await execute(tool, { path: "/docs/file.txt", content: "changed" }),
    ).toMatchObject({ ok: true, storagePath: "base/file.txt" });
    expect(state.write).toHaveBeenCalledWith(
      {
        storage: {
          type: "documentRepository",
          documentRepositoryId: "repo-id",
          workspaceId: "workspace",
        },
        path: "base/file.txt",
        text: "changed",
        createIfMissing: true,
      },
      expect.objectContaining({
        authenticatedUser,
        abortSignal: options.abortSignal,
      }),
    );
  });
  it("reports a failed write without exposing storage errors", async () => {
    state.write.mockRejectedValue(new Error("private storage details"));
    const tool = storageWriteFileTool(
      "activity",
      "agent",
      [mount],
      [repo],
      context,
    );
    expect(
      await execute(tool, { path: "/docs/file.txt", content: "changed" }),
    ).toEqual({ ok: false, error: "The file content could not be saved." });
  });
  it.each([
    [{ status: "saved", file, indexQueued: false }, "file was saved"],
    [{ status: "recoveryRequired" }, "retry writing the same content"],
  ])(
    "reports partial outcomes without claiming full success",
    async (result, message) => {
      state.write.mockResolvedValue(result);
      const tool = storageWriteFileTool(
        "activity",
        "agent",
        [mount],
        [repo],
        context,
      );
      expect(
        await execute(tool, { path: "/docs/file.txt", content: "changed" }),
      ).toEqual({ ok: false, error: expect.stringContaining(message) });
    },
  );
  it("rejects folders, unauthorized mounts and traversal before normalization", async () => {
    const tool = storageWriteFileTool(
      "activity",
      "agent",
      [mount],
      [repo],
      context,
    );
    state.write.mockRejectedValue(new Error("TARGET_IS_FOLDER"));
    expect(
      await execute(tool, { path: "/docs/folder", content: "" }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("folder") });
    state.write.mockClear();
    for (const path of [
      "/docs-other",
      "/docs/../this_conversation/file.txt",
      "/docs/a.txt.__xrag_text_write.json",
    ]) {
      expect(await execute(tool, { path, content: "" })).toMatchObject({
        ok: false,
      });
    }
    expect(state.write).not.toHaveBeenCalled();
    const approval = storageWriteFileToolApproval(
      "activity",
      "agent",
      [mount],
      [repo],
    );
    expect(
      approval({ path: "/docs/../this_conversation/file.txt", content: "" }),
    ).toBe("denied");
  });
  it("rejects a read-only mount at execution even when invoked directly", async () => {
    const tool = storageWriteFileTool(
      "activity",
      "agent",
      [{ ...mount, permission: "read-only" }],
      [repo],
      context,
    );
    expect(
      await execute(tool, { path: "/docs/file.txt", content: "forged" }),
    ).toMatchObject({ ok: false });
    expect(state.write).not.toHaveBeenCalled();
  });
  it.each([
    ["confirm-write", "user-approval"],
    ["read-only", "denied"],
    ["write", "approved"],
  ])("requires %s approval: %s", (permission, expected) => {
    const approval = storageWriteFileToolApproval(
      "activity",
      "agent",
      [{ ...mount, permission }],
      [repo],
    );
    expect(approval({ path: "/docs/a", content: "" })).toBe(expected);
    expect(approval({ path: "/unknown", content: "" })).toBe("not-applicable");
  });
});
describe("agent search", () => {
  it("maps identifiers and rejects paths outside the mounted directory boundary", async () => {
    state.search.mockResolvedValue({
      documentsByKeywords: [
        { file: { ...file, path: "base/inside.txt" }, digest: "inside" },
        {
          file: { ...file, path: "base-other/private.txt" },
          digest: "private",
        },
      ],
      documentsBySemantic: [],
    });
    const tool = storageSearchTool([mount], [repo], context);
    const result = await execute(
      tool,
      { keywords: ["topic"] },
      {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "question" },
              { type: "image", image: "ignored" },
            ],
          },
        ],
      },
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      file: { path: "docs/inside.txt" },
      storage: { workspaceId: "workspace", documentRepositoryId: "repo-id" },
      storagePath: "base/inside.txt",
    });
    expect(state.search).toHaveBeenCalledWith(
      repo,
      { keywords: ["topic"], semantic: "question" },
      expect.anything(),
    );
    const searchOptions = state.search.mock.lastCall![2];
    searchOptions.embeddingModel("model");
    expect(state.embedding).toHaveBeenCalledWith("model", expect.anything());
  });
  it("falls back to keywords or the most recent user message", async () => {
    const tool = storageSearchTool([mount], [repo], context);
    await execute(tool, { keywords: ["one", "two"] });
    expect(state.search.mock.lastCall![1].semantic).toBe("one, two");
    await execute(
      tool,
      { keywords: [] },
      {
        messages: [
          { role: "user", content: "first" },
          { role: "user", content: "last" },
          { role: "assistant", content: "irrelevant" },
        ],
      },
    );
    expect(state.search.mock.lastCall![1].semantic).toBe("last");
  });
});
describe("agent tool sessions", () => {
  it("omits repository and MCP tools when unconfigured", async () => {
    const session = new AgentToolSession(
      "activity",
      "agent",
      { documentRepositoryMounts: [] } as any,
      { ...context, abortSignal: options.abortSignal },
    );
    expect(await session.tools()).toEqual({});
    expect(state.repos).not.toHaveBeenCalled();
    await session[Symbol.asyncDispose]();
  });
  it("connects MCP only on tool invocation and closes clients", async () => {
    const close = vi.fn();
    const tools = vi.fn(async () => ({ remote: { description: "remote" } }));
    state.mcp.mockResolvedValue({
      tools,
      close,
      listTools: vi.fn(async () => ({ tools: [] })),
    });
    const session = new AgentToolSession(
      "activity",
      "agent",
      {
        documentRepositoryMounts: [mount],
        mcps: [
          {
            id: "mcp",
            type: "http",
            url: "https://mcp.test",
            headers: { Authorization: "test" },
          },
        ],
      } as any,
      { ...context, abortSignal: options.abortSignal },
    );
    await session.tools();
    expect(state.mcp).not.toHaveBeenCalled();
    const approvals: any = await session.toolApproval();
    expect(
      await approvals.mcp({ serverId: "mcp" }, { toolCallId: "list" }),
    ).toBe("approved");
    expect(state.mcp).toHaveBeenCalledWith({
      clientName: "schornai-agent-mcp-v2",
      transport: {
        type: "http",
        url: "https://mcp.test",
        headers: { Authorization: "test" },
        authProvider: expect.anything(),
        fetch: expect.any(Function),
      },
    });
    expect(Object.keys(await session.tools())).toEqual(
      expect.arrayContaining([
        "storage-list",
        "storage-read-file",
        "storage-write-file",
        "storage-search",
        "mcp",
      ]),
    );
    const approval: any = await session.toolApproval();
    expect(approval["storage-write-file"]({ path: "/docs/a" })).toBe(
      "user-approval",
    );
    await session[Symbol.asyncDispose]();
    expect(close).toHaveBeenCalledOnce();
  });
});

describe("web tools in the agent session", () => {
  it.each([
    [undefined, []],
    [{ active: false, webFetch: "on", webSearch: "on" }, []],
    [
      { active: true, webFetch: "on", webSearch: "off" },
      ["storage-list", "storage-read-file", "web-fetch"],
    ],
    [{ active: true, webFetch: "off", webSearch: "on" }, ["web-search"]],
    [
      { active: true, webFetch: "ask", webSearch: "ask" },
      ["storage-list", "storage-read-file", "web-fetch", "web-search"],
    ],
  ])("registers independently enabled tools for %j", async (web, expected) => {
    const session = new AgentToolSession(
      "activity",
      "agent",
      {
        documentRepositoryMounts: [],
        toolWebAccess: web
          ? { webFetchAccess: "allow-all", webFetchAllowList: [], ...web }
          : undefined,
      } as any,
      { ...context, abortSignal: options.abortSignal },
    );
    expect(Object.keys(await session.tools())).toEqual(expected);
    const approval: any = await session.toolApproval();
    expect(
      typeof approval["web-fetch"] === "function"
        ? approval["web-fetch"]({ url: "https://example.com" })
        : approval["web-fetch"],
    ).toBe(web?.webFetch === "ask" ? "user-approval" : "approved");
    expect(approval["web-search"]).toBe(
      web?.webSearch === "ask" ? "user-approval" : "approved",
    );
    await session[Symbol.asyncDispose]();
  });
});

describe("lazy MCP authorization", () => {
  it("pauses an actual call for OAuth and reconnects after authorization", async () => {
    const { MCPToolSession } =
      await import("../apps/realtime/src/chat/MCPToolSession");
    const { MCPAuthorizationRequired } =
      await import("../packages/realtime/src/mcp/MCPOAuthProvider");
    const close = vi.fn();
    const listTools = vi.fn(async () => ({
      tools: [{ name: "boards", inputSchema: { type: "object" } }],
    }));
    const callTool = vi.fn(async () => ({
      content: [{ type: "text", text: "boards" }],
    }));
    state.mcp
      .mockRejectedValueOnce(new MCPAuthorizationRequired("trello"))
      .mockResolvedValue({ close, listTools, callTool });
    const session = new MCPToolSession(
      [
        {
          id: "trello",
          name: "Trello",
          type: "http",
          url: "https://mcp.test",
          headers: {},
        },
      ],
      "user",
      {} as any,
    );
    const gateway = session.tool();
    expect(state.mcp).not.toHaveBeenCalled();
    expect(
      await session.approval(
        { serverId: "trello" },
        { toolCallId: "discovery" },
      ),
    ).toBe("user-approval");
    expect(callTool).not.toHaveBeenCalled();
    expect(
      await session.approval(
        { serverId: "trello" },
        { toolCallId: "discovery" },
      ),
    ).toBe("approved");
    await execute(gateway, { serverId: "trello" }, { toolCallId: "discovery" });
    expect(listTools).toHaveBeenCalledOnce();
    await execute(gateway, {
      serverId: "trello",
      toolName: "boards",
      arguments: { limit: 2 },
    });
    expect(callTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "boards", arguments: { limit: 2 } }),
    );
    await session[Symbol.asyncDispose]();
    expect(close).toHaveBeenCalledOnce();
  });
});
