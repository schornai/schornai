import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  webFetchTool,
  webFetchToolApproval,
  type WebFetchContext,
} from "../apps/realtime/src/chat/tools/web/webFetch";
import { webSearchTool as actualWebSearchTool } from "../apps/realtime/src/chat/tools/web/webSearch";
import {
  defaultWebAccess,
  isWebUrlAllowed,
  normalizeWebDomain,
  type WebAccessConfig,
} from "../packages/database/src/agent/webAccess";
import { webAccessConfigSchema } from "../packages/database/src/agent/_schemas";
import { validateChatMessages } from "../packages/database/src/chat/_schema";

const config = {
  ...defaultWebAccess,
  webFetch: "on",
  webSearch: "on",
  webSearchProvider: "staan",
  webSearchApiKey: "secret",
};
// Exercise provider protocols using credentials resolved on the server.
const webSearchTool = (
  config: WebAccessConfig & { webSearchApiKey?: string },
  request: any,
) =>
  actualWebSearchTool(config, request, async () => ({
    kind: config.webSearchProvider ?? "",
    secret: config.webSearchApiKey ?? null,
    market: config.webSearchMarket ?? null,
  }));
const options = { messages: [], toolCallId: "call" };
const execute = (tool: any, input: unknown, extra = {}) =>
  tool.execute(tool.inputSchema.parse(input), { ...options, ...extra });
const response = (body: string, extra = {}) => ({
  status: 200,
  contentType: "text/html; charset=utf-8",
  body: Buffer.from(body),
  ...extra,
});

describe("web access policy", () => {
  it.each([
    "localhost",
    "example.com/path",
    "https://example.com",
    "example.com:80",
    "user@example.com",
    "foo bar",
    "*.example.com",
  ])("normalizes domains: %s", (domain) => {
    expect(normalizeWebDomain(domain)).toBe(
      ["localhost", "*.example.com"].includes(domain) ? domain : undefined,
    );
  });
  it("normalizes IDN and case, and matches only exact hosts or explicit subdomains", () => {
    expect(normalizeWebDomain("BÜCHER.de.")).toBe("xn--bcher-kva.de");
    const rules = {
      ...config,
      webFetchAccess: "allow-list",
      webFetchAllowList: ["EXAMPLE.com", "*.docs.org"],
    } as const;
    const allowed = (url: string) =>
      isWebUrlAllowed(new URL(url), rules as WebAccessConfig);
    expect(allowed("https://example.com/a")).toBe(true);
    expect(allowed("https://example.com./a")).toBe(true);
    expect(allowed("https://a.docs.org/a")).toBe(true);
    for (const url of [
      "https://example.com.evil.org",
      "https://sub.example.com",
      "https://docs.org",
      "https://fakedocs.org",
      "https://user:pass@example.com",
      "file:///etc/passwd",
    ])
      expect(allowed(url)).toBe(false);
    expect(
      isWebUrlAllowed(new URL("https://example.com"), {
        ...config,
        active: false,
      }),
    ).toBe(false);
    expect(
      isWebUrlAllowed(new URL("https://example.com"), {
        ...config,
        webFetch: "off",
      }),
    ).toBe(false);
    expect(
      isWebUrlAllowed(new URL("https://example.com"), {
        ...config,
        webFetchAccess: "allow-list",
        webFetchAllowList: [],
      }),
    ).toBe(false);
  });
  it.each([
    "http://localhost:3000/page",
    "http://127.0.0.1/page",
    "http://10.1.1.1/page",
    "http://192.168.1.1/page",
    "http://172.16.0.1/page",
    "http://[::1]/page",
    "http://[fd00::1]/page",
    "http://intranet.local/page",
  ])("allows internal destinations with unrestricted fetch: %s", (url) => {
    expect(isWebUrlAllowed(new URL(url), config)).toBe(true);
    expect(
      isWebUrlAllowed(new URL(url), {
        ...config,
        webFetchAccess: "allow-list",
        webFetchAllowList: ["example.com"],
      }),
    ).toBe(false);
  });
  it("allows configured internal hosts through the domain whitelist", () => {
    const restricted = {
      ...config,
      webFetchAccess: "allow-list",
      webFetchAllowList: ["localhost", "192.168.1.1", "intranet.local"],
    } as WebAccessConfig;
    for (const url of [
      "http://localhost:3000",
      "http://192.168.1.1",
      "http://intranet.local",
    ])
      expect(isWebUrlAllowed(new URL(url), restricted)).toBe(true);
  });
});

const storageMocks = vi.hoisted(() => ({
  create: vi.fn(),
  clear: vi.fn(),
  task: vi.fn(),
  run: vi.fn(),
  content: vi.fn(),
  dispose: vi.fn(),
  session: undefined as any,
}));
vi.mock("@schornio/aibox-database/storage/createFile", () => ({
  createFile: storageMocks.create,
}));
vi.mock("@schornio/aibox-database/storage/getDocumentContent", () => ({
  getDocumentContent: storageMocks.content,
}));
vi.mock("@schornio/aibox-database/storage/clearDocumentContent", () => ({
  clearDocumentContent: storageMocks.clear,
}));
vi.mock(
  "@schornio/aibox-realtime/documents/storage/createStorageProcessingTask",
  () => ({ createStorageProcessingTask: storageMocks.task }),
);
vi.mock("@schornio/aibox-realtime/documents/taskQueue/runTask", () => ({
  runTask: storageMocks.run,
}));
vi.mock(
  "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      constructor(options: unknown) {
        storageMocks.session = options;
      }
      [Symbol.asyncDispose] = storageMocks.dispose;
    },
  }),
);
const fetchContext = {
  activityId: "chat",
  agentId: "agent",
  userId: "user",
  userClaims: [],
  mounts: [],
  mountedDocumentRepositories: [],
  supabase: { storage: {} },
  serverToken: "Worker test",
  websocketProvider: {},
} as unknown as WebFetchContext;
beforeEach(() => {
  storageMocks.clear.mockReset().mockResolvedValue(undefined);
  storageMocks.create
    .mockReset()
    .mockImplementation(async (blob: Blob, path: string) => ({
      file: true,
      path,
      name: path.split("/").at(-1),
      size: blob.size,
      type: blob.type,
      createdAtISO: "2026-10-11",
      updatedAtISO: "2026-10-11",
    }));
  storageMocks.task
    .mockReset()
    .mockImplementation(async (parameters: unknown) => ({
      type: "process-file",
      parameters,
      requiredCapabilities: [],
    }));
  storageMocks.run.mockReset().mockResolvedValue(undefined);
  storageMocks.content.mockReset().mockResolvedValue({
    type: "mdc",
    current: "Extracted text",
    versions: [],
  });
});

describe("web fetch", () => {
  it.each([
    [
      "/docs",
      "/research",
      "/docs/sub/report.pdf",
      "research/sub/report.pdf",
      "documentRepository",
    ],
    [
      "/",
      "/research",
      "/sub/report.pdf",
      "research/sub/report.pdf",
      "documentRepository",
    ],
    [
      "/",
      "/research",
      "/this_conversation/web/example.com/report.pdf",
      "web/example.com/report.pdf",
      "activity",
    ],
  ])(
    "resolves mount %s and destination %s through the storage mapping",
    async (mount, base, path, storagePath, type) => {
      const context = {
        ...fetchContext,
        mounts: [
          {
            mount,
            pathRepository: base,
            permission: "write",
            documentRepositoryIdentifier: "repo",
          },
        ],
        mountedDocumentRepositories: [
          { identifier: "repo", id: "repo-id", workspaceId: "workspace" },
        ],
      } as WebFetchContext;
      const tool = webFetchTool(
        config,
        context,
        vi
          .fn()
          .mockResolvedValue(
            response("pdf", { contentType: "application/pdf" }),
          ),
      );
      expect(
        await execute(tool, { url: "https://example.com/report.pdf", path }),
      ).toMatchObject({
        ok: true,
        path,
        storagePath,
        file: { path },
        storage: { type },
      });
      for (const folder of ["/", "/this_conversation", mount]) {
        expect(
          webFetchToolApproval(
            config,
            context,
          )({ url: "https://example.com", path: folder }),
        ).toBe("denied");
        expect(
          await execute(tool, { url: "https://example.com", path: folder }),
        ).toMatchObject({ ok: false });
      }
    },
  );
  it("overwrites the same readable chat path and returns the newly processed text", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response("old bytes"))
      .mockResolvedValueOnce(response("new bytes"));
    const tool = webFetchTool(config, fetchContext, request);
    storageMocks.content
      .mockResolvedValueOnce({ type: "mdc", current: "Old text" })
      .mockResolvedValueOnce({ type: "mdc", current: "New text".repeat(5000) });
    const first = await execute(tool, {
      url: "https://example.com/path/to/file",
    });
    const second = await execute(tool, {
      url: "https://example.com/path/to/file",
    });
    expect(first.path).toBe(
      "/this_conversation/web/example.com/path/to/file/index.html",
    );
    expect(second.path).toBe(first.path);
    expect(first.content).toBe("Old text");
    expect(second.content).toBe("New text".repeat(5000));
    expect(storageMocks.create.mock.calls.map((call) => call[1])).toEqual([
      "web/example.com/path/to/file/index.html",
      "web/example.com/path/to/file/index.html",
    ]);
    expect(storageMocks.clear).toHaveBeenCalledTimes(2);
    expect(storageMocks.clear.mock.invocationCallOrder[1]).toBeLessThan(
      storageMocks.run.mock.invocationCallOrder[1]!,
    );
  });
  it("includes transcript text rather than only file metadata", async () => {
    storageMocks.task.mockResolvedValue({
      type: "transcribe",
      parameters: {},
      requiredCapabilities: [],
    });
    storageMocks.content.mockResolvedValue({
      type: "transcript",
      segments: [
        {
          words: [
            { word: " Hello" },
            { word: " wrld", wordOverride: " world" },
          ],
        },
        { segmentOverride: "Corrected segment", words: [] },
      ],
    });
    const result = await execute(
      webFetchTool(
        config,
        fetchContext,
        vi
          .fn()
          .mockResolvedValue(response("audio", { contentType: "audio/mpeg" })),
      ),
      { url: "https://example.com/recording.mp3" },
    );
    expect(result).toMatchObject({
      processing: "ready",
      content: " Hello world\nCorrected segment",
    });
  });
  it("does not return stale content when processing is unavailable or invalidation fails", async () => {
    const tool = webFetchTool(
      config,
      fetchContext,
      vi.fn().mockResolvedValue(response("body")),
    );
    storageMocks.content.mockResolvedValue(undefined);
    expect(await execute(tool, { url: "https://example.com" })).toMatchObject({
      processing: "unavailable",
      content: undefined,
    });
    storageMocks.clear.mockRejectedValue(
      new Error("cannot clear old extraction"),
    );
    storageMocks.content.mockClear();
    expect(await execute(tool, { url: "https://example.com" })).toMatchObject({
      processing: "failed",
      content: undefined,
    });
    expect(storageMocks.content).not.toHaveBeenCalled();
  });
  it("stores binary files unchanged and returns a readable chat path after processing", async () => {
    const bytes = Buffer.from([37, 80, 68, 70, 0, 255, 128]);
    const request = vi.fn().mockResolvedValue(
      response("", {
        body: bytes,
        contentType: "application/pdf",
        contentDisposition: 'attachment; filename="report.pdf"',
      }),
    );
    const output = await execute(webFetchTool(config, fetchContext, request), {
      url: "https://example.com/download",
    });
    const [blob, path, , writeOptions] = storageMocks.create.mock.calls[0]!;
    expect(Buffer.from(await blob.arrayBuffer())).toEqual(bytes);
    expect(blob.type).toBe("application/pdf");
    expect(writeOptions).toEqual({ upsert: true });
    expect(path).toBe("web/example.com/download/report.pdf");
    expect(output).toMatchObject({
      ok: true,
      path: `/this_conversation/${path}`,
      file: { path: `/this_conversation/${path}` },
      processing: "ready",
      content: "Extracted text",
      storage: { type: "activity", agentId: "agent", activityId: "chat" },
    });
    expect(storageMocks.run).toHaveBeenCalledWith(
      "process-file",
      expect.objectContaining({ path, userId: "user", userClaims: [] }),
      [],
      expect.anything(),
    );
    expect(request.mock.calls[0]![1]).toMatchObject({
      maxBytes: 50 * 1024 * 1024,
      headers: { Accept: "*/*" },
    });
    expect(storageMocks.dispose).toHaveBeenCalled();
  });
  it.each(["process-file", "transcribe"])(
    "waits for %s before making the result available",
    async (type) => {
      const done = Promise.withResolvers<void>();
      storageMocks.task.mockResolvedValue({
        type,
        parameters: { path: "file" },
        requiredCapabilities: [],
      });
      storageMocks.run.mockReturnValue(done.promise);
      let finished = false;
      const result = execute(
        webFetchTool(
          config,
          fetchContext,
          vi.fn().mockResolvedValue(response("content")),
        ),
        { url: "https://example.com" },
      ).then((output: any) => {
        finished = true;
        return output;
      });
      await vi.waitFor(() => expect(storageMocks.run).toHaveBeenCalled());
      expect(finished).toBe(false);
      expect(storageMocks.content).not.toHaveBeenCalled();
      done.resolve();
      expect(await result).toMatchObject({
        ok: true,
        processing: "ready",
        content: "Extracted text",
      });
    },
  );
  it("retains downloads when extraction is unavailable or fails", async () => {
    const tool = webFetchTool(
      config,
      fetchContext,
      vi.fn().mockResolvedValue(response("content")),
    );
    storageMocks.task.mockResolvedValue(undefined);
    expect(await execute(tool, { url: "https://example.com" })).toMatchObject({
      ok: true,
      processing: "unavailable",
    });
    storageMocks.task.mockResolvedValue({
      type: "process-file",
      parameters: {},
      requiredCapabilities: [],
    });
    storageMocks.run.mockRejectedValue(new Error("internal credentials"));
    const output = await execute(tool, { url: "https://example.com" });
    expect(output).toMatchObject({ ok: true, processing: "failed" });
    expect(JSON.stringify(output)).not.toContain("internal credentials");
    storageMocks.create.mockRejectedValue(new Error("already exists"));
    storageMocks.run.mockClear();
    expect(await execute(tool, { url: "https://example.com" })).toMatchObject({
      ok: false,
    });
    expect(storageMocks.run).not.toHaveBeenCalled();
  });
  it("enforces policy before requests and at redirects", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        response("", { status: 302, location: "https://evil.org" }),
      );
    const tool = webFetchTool(
      {
        ...config,
        webFetchAccess: "allow-list",
        webFetchAllowList: ["example.com"],
      },
      fetchContext,
      request,
    );
    expect(await execute(tool, { url: "https://evil.org" })).toMatchObject({
      ok: false,
    });
    expect(request).not.toHaveBeenCalled();
    expect(await execute(tool, { url: "https://example.com" })).toMatchObject({
      ok: false,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(storageMocks.create).not.toHaveBeenCalled();
  });
  it("follows relative redirects and rejects loops and HTTP errors", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response("", { status: 301, location: "/docs" }))
      .mockResolvedValue(response("content"));
    expect(
      await execute(webFetchTool(config, fetchContext, request), {
        url: "https://example.com",
      }),
    ).toMatchObject({ ok: true, url: "https://example.com/docs" });
    request
      .mockReset()
      .mockResolvedValue(response("", { status: 302, location: "/loop" }));
    expect(
      await execute(webFetchTool(config, fetchContext, request), {
        url: "https://example.com",
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("redirect") });
    expect(request).toHaveBeenCalledTimes(6);
    request.mockResolvedValue(response("forbidden", { status: 403 }));
    expect(
      await execute(webFetchTool(config, fetchContext, request), {
        url: "https://example.com",
      }),
    ).toMatchObject({ ok: false });
  });
  it.each(["read-only", "confirm-write", "write"] as const)(
    "respects mounted %s destinations and combines write/fetch approvals",
    async (permission) => {
      const context = {
        ...fetchContext,
        mounts: [
          {
            id: "mount",
            documentRepositoryIdentifier: "repo",
            mount: "docs",
            pathRepository: "research",
            permission,
          },
        ],
        mountedDocumentRepositories: [
          { identifier: "repo", id: "repo-id", workspaceId: "workspace" },
        ],
      } as WebFetchContext;
      const input = {
        url: "https://example.com/report.pdf",
        path: "docs/report.pdf",
      };
      const approval = webFetchToolApproval(config, context);
      expect(approval(input)).toBe(
        permission === "read-only"
          ? "denied"
          : permission === "confirm-write"
            ? "user-approval"
            : "approved",
      );
      expect(
        webFetchToolApproval({ ...config, webFetch: "ask" }, context)(input),
      ).toBe(permission === "read-only" ? "denied" : "user-approval");
      const request = vi
        .fn()
        .mockResolvedValue(response("pdf", { contentType: "application/pdf" }));
      const tool = webFetchTool(config, context, request);
      const result = await execute(tool, input);
      if (permission === "read-only") {
        expect(result.ok).toBe(false);
        expect(request).not.toHaveBeenCalled();
      } else {
        expect(result).toMatchObject({
          ok: true,
          path: "/docs/report.pdf",
          storagePath: "research/report.pdf",
          storage: {
            type: "documentRepository",
            documentRepositoryId: "repo-id",
            workspaceId: "workspace",
          },
        });
      }
      expect(approval({ ...input, path: "unknown/report.pdf" })).toBe("denied");
      expect(
        await execute(tool, { ...input, path: "unknown/report.pdf" }),
      ).toMatchObject({ ok: false });
    },
  );
  it("propagates cancellation during download and processing", async () => {
    const abort = new AbortController();
    const request = vi.fn().mockImplementation(async (_url, { signal }) => {
      abort.abort(new Error("cancelled"));
      signal.throwIfAborted();
    });
    await expect(
      execute(
        webFetchTool(config, fetchContext, request),
        { url: "https://example.com" },
        { abortSignal: abort.signal },
      ),
    ).rejects.toThrow("cancelled");
    const processingAbort = new AbortController();
    storageMocks.run.mockImplementation(async () => {
      processingAbort.abort(new Error("stop processing"));
      throw processingAbort.signal.reason;
    });
    await expect(
      execute(
        webFetchTool(
          config,
          fetchContext,
          vi.fn().mockResolvedValue(response("body")),
        ),
        { url: "https://example.com" },
        { abortSignal: processingAbort.signal },
      ),
    ).rejects.toThrow("stop processing");
  });
});

describe("web search providers", () => {
  it("calls Staan v2 with bearer auth, market, offset and normalizes results", async () => {
    const request = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          web: {
            results: Array.from({ length: 10 }, () => ({
              title: "Result",
              url: "https://example.com",
              snippet: "Text",
            })),
          },
        }),
      ),
    );
    const output = await execute(
      webSearchTool({ ...config, webSearchMarket: "de-de" }, request),
      { query: "hello & world", offset: 10 },
    );
    expect(output).toMatchObject({
      ok: true,
      provider: "staan",
      query: "hello & world",
      nextOffset: 20,
      results: expect.arrayContaining([
        { title: "Result", url: "https://example.com/", snippet: "Text" },
      ]),
    });
    const [url, init] = request.mock.calls[0]!;
    expect(url.origin + url.pathname).toBe(
      "https://api.staan.ai/v2/search/web",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "hello & world",
      market: "de-de",
      offset: "10",
    });
    expect(init.headers.Authorization).toBe("Bearer secret");
    expect(url.href).not.toContain("secret");
    expect(
      await execute(webSearchTool(config, request), {
        query: "test",
        offset: 40,
      }),
    ).toMatchObject({ ok: false });
  });
  it("calls Brave with header auth and page-based paging", async () => {
    const request = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Brave result",
                url: "https://example.com",
                description: "Snippet",
              },
            ],
          },
          query: { more_results_available: true },
        }),
      ),
    );
    const output = await execute(
      webSearchTool({ ...config, webSearchProvider: "brave" }, request),
      { query: "hello", offset: 10 },
    );
    expect(Object.fromEntries(request.mock.calls[0]![0].searchParams)).toEqual({
      q: "hello",
      count: "10",
      offset: "1",
      text_decorations: "false",
      result_filter: "web",
    });
    expect(request.mock.calls[0]![1].headers["X-Subscription-Token"]).toBe(
      "secret",
    );
    expect(output).toMatchObject({
      ok: true,
      provider: "brave",
      nextOffset: 20,
      results: [
        {
          title: "Brave result",
          url: "https://example.com/",
          snippet: "Snippet",
        },
      ],
    });
    expect(JSON.stringify(output)).not.toContain("secret");
    expect(
      await execute(
        webSearchTool({ ...config, webSearchProvider: "brave" }, request),
        { query: "hello", offset: 1 },
      ),
    ).toMatchObject({ ok: false });
  });
  it("handles empty and unsafe results, malformed payloads and provider errors", async () => {
    const request = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          web: {
            results: [
              { title: "Bad", url: "javascript:alert(1)" },
              {
                title: "Private credentials",
                url: "https://user:pass@example.com",
              },
            ],
          },
        }),
      ),
    );
    expect(
      await execute(webSearchTool(config, request), { query: "hello" }),
    ).toMatchObject({ ok: true, results: [] });
    request.mockResolvedValue(
      response('{"query":{"more_results_available":false}}'),
    );
    expect(
      await execute(
        webSearchTool({ ...config, webSearchProvider: "brave" }, request),
        { query: "hello" },
      ),
    ).toMatchObject({ ok: true, results: [] });
    expect(
      await execute(webSearchTool(config, request), { query: "hello" }),
    ).toMatchObject({ ok: false });
    request.mockResolvedValue(response("secret", { status: 429 }));
    expect(
      await execute(webSearchTool(config, request), { query: "hello" }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("429") });
  });
  it("requires enabled search and provider credentials without contacting the network", async () => {
    const request = vi.fn();
    for (const patch of [
      { webSearch: "off" },
      { active: false },
      { webSearchApiKey: "" },
      { webSearchProvider: undefined },
    ]) {
      expect(
        await execute(
          webSearchTool({ ...config, ...patch } as WebAccessConfig, request),
          { query: "hello" },
        ),
      ).toMatchObject({ ok: false });
    }
    expect(request).not.toHaveBeenCalled();
  });
  it("validates queries and propagates cancellation", async () => {
    const abort = new AbortController();
    const request = vi.fn().mockImplementation(async () => {
      abort.abort();
      abort.signal.throwIfAborted();
    });
    const tool = webSearchTool(config, request);
    expect(() => tool.inputSchema.parse({ query: "x".repeat(401) })).toThrow();
    await expect(
      execute(tool, { query: "hello" }, { abortSignal: abort.signal }),
    ).rejects.toThrow();
  });
  it("round-trips web tool results through persisted chat validation", async () => {
    const messages = [
      {
        id: "message",
        role: "assistant",
        parts: [
          {
            type: "tool-web-search",
            toolCallId: "search",
            state: "output-available",
            input: { query: "hello" },
            output: {
              ok: true,
              provider: "staan",
              query: "hello",
              results: [],
            },
          },
          {
            type: "tool-web-fetch",
            toolCallId: "fetch",
            state: "output-available",
            input: { url: "https://example.com" },
            output: {
              ok: true,
              url: "https://example.com",
              title: "Example",
              content: "Hello",
              contentOffset: 0,
              totalLength: 5,
              truncated: false,
            },
          },
        ],
      },
    ];
    expect(await validateChatMessages(messages)).toEqual(messages);
  });
});

describe("saved web access settings", () => {
  it("round-trips provider credentials, approval choices and whitelist", () => {
    const { webSearchApiKey, ...metadata } = config;
    expect(webAccessConfigSchema.parse(config)).toEqual(metadata);
    expect(webAccessConfigSchema.parse(config)).not.toHaveProperty(
      "webSearchApiKey",
    );
    expect(
      webAccessConfigSchema.parse({
        ...config,
        webSearchProvider: "brave",
        webFetch: "ask",
        webFetchAccess: "allow-list",
        webFetchAllowList: ["example.com", "*.example.org"],
      }),
    ).toMatchObject({ webSearchProvider: "brave", webFetch: "ask" });
  });
  it("rejects invalid active configuration but allows disabling it and reading legacy records", () => {
    expect(
      webAccessConfigSchema.safeParse({
        ...config,
        webSearchConnectionId: "search-connection",
      }).success,
    ).toBe(true);
    expect(
      webAccessConfigSchema.safeParse({
        ...config,
        webFetchAccess: "allow-list",
        webFetchAllowList: ["https://example.com"],
      }).success,
    ).toBe(false);
    expect(
      webAccessConfigSchema.safeParse({
        ...config,
        active: false,
        webSearchApiKey: "",
      }).success,
    ).toBe(true);
    expect(
      webAccessConfigSchema.safeParse({
        active: true,
        webFetchAccess: "allow-all",
        webFetchAllowList: [],
        webSearch: "on",
      }).success,
    ).toBe(true);
  });
});
