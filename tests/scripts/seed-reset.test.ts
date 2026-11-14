import { getRealtimeDocumentPermission } from "../../packages/database/src/realtime/getRealtimeDocumentPermission";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { confirmReset, localUrl } from "../../scripts/seed-reset.mjs";
import { agentConfigSchema } from "../../packages/database/src/agent/_schemas";
import { documentRepositoryConfigSchema } from "../../packages/database/src/documentRepositories/_schema";
import {
  aiModelOllamaLLMV1Schema,
  aiModelOllamaEmbeddingV1Schema,
  aiModelMLXWhisperV1Schema,
} from "../../packages/database/src/aiModel/_schema";

describe("local seed reset safety", () => {
  it.each([
    "https://example.com:54321",
    "http://127.0.0.1:54322",
    "http://localhost.evil:54321",
    "http://secret@localhost:54321",
    "http://localhost:54321/?secret=key",
  ])("rejects unsafe target %s", (url) => {
    expect(() => localUrl(url, 54321)).toThrow();
  });
  it("accepts local CLI URLs", () => {
    expect(localUrl("http://127.0.0.1:54321", 54321)).toBe(
      "http://127.0.0.1:54321",
    );
  });
  it.each(["", "yes", "RESET other-project", "RESET schornai "])(
    "does not reset for %j",
    async (answer) => {
      const reset = vi.fn();
      await confirmReset({
        project: "schornai",
        interactive: true,
        ask: async () => answer,
        reset,
        log: vi.fn(),
      });
      expect(reset).not.toHaveBeenCalled();
    },
  );
  it("rejects unattended execution even with a matching answer", async () => {
    const reset = vi.fn();
    await expect(
      confirmReset({
        project: "schornai",
        interactive: false,
        ask: async () => "RESET schornai",
        reset,
        log: vi.fn(),
      }),
    ).rejects.toThrow("interaktives Terminal");
    expect(reset).not.toHaveBeenCalled();
  });
  it("resets exactly once after explicit confirmation", async () => {
    const reset = vi.fn();
    expect(
      await confirmReset({
        project: "schornai",
        interactive: true,
        ask: async () => "RESET schornai",
        reset,
        log: vi.fn(),
      }),
    ).toBe(true);
    expect(reset).toHaveBeenCalledTimes(1);
  });
  it("propagates reset errors", async () => {
    await expect(
      confirmReset({
        project: "schornai",
        interactive: true,
        ask: async () => "RESET schornai",
        reset: async () => {
          throw Error("failed");
        },
        log: vi.fn(),
      }),
    ).rejects.toThrow("failed");
  });
});

describe("seed matches application schemas", () => {
  const sql = readFileSync(
    new URL("../../supabase/seed.sql", import.meta.url),
    "utf8",
  );
  const configs = [...sql.matchAll(/'(\{[^']*\})'/g)].map((match) =>
    JSON.parse(match[1]),
  );
  it("has a current agent with a valid repository mount", () => {
    const agent = agentConfigSchema.parse(
      JSON.parse(sql.match(/\$agent\$([\s\S]*?)\$agent\$/)![1]),
    );
    const repository = documentRepositoryConfigSchema.parse(
      configs.find((config) => config.type === "database-v2"),
    );
    expect(
      agent.roles[0].documentRepositoryMounts[0].documentRepositoryIdentifier,
    ).toBe(repository.identifier);
    expect(agent.modelIdentifier).toBe("qwen3:0.6b");
    expect(agent.roles[0].toolCalculator).toEqual({ active: true });
    expect(agent.roles[0].toolChatAwareness).toEqual({
      active: true,
      updateChatLabel: true,
      recommendNextMessages: true,
      currentDateTime: true,
    });
    expect(agent.roles[0].toolPlatformAccess).toEqual({
      active: true,
      level: "workspace",
      approvals: {
        user: "auto",
        editor: "auto",
        workspace: "ask",
        admin: "off",
      },
    });
    const transcriber = configs.find(
      (config) => config.version === "transcriber-v2",
    );
    expect(transcriber?.identifier).toBeTruthy();
    expect(transcriber?.retryLevel).toBe("balanced");
    expect(agent.transcriberIdentifier).toBe(transcriber.identifier);
    expect(repository.transcriberIdentifier).toBe(transcriber.identifier);
  });
  it("uses valid model configurations", () => {
    aiModelOllamaLLMV1Schema.parse({
      type: "ollama_llm_v1",
      config: configs.find((c) => c.ollamaIdentifier === "qwen3:0.6b"),
    });
    aiModelOllamaEmbeddingV1Schema.parse({
      type: "ollama_embedding_v1",
      config: configs.find((c) => c.ollamaIdentifier === "nomic-embed-text"),
    });
    aiModelMLXWhisperV1Schema.parse({
      type: "mlx_whisper_v1",
      config: configs.find((c) => c.fileSystemIdentifier === "whisper-tiny"),
    });
  });
  it("provides all local model card types without external credentials", () => {
    expect(sql).toContain("a1b00000-0000-4000-8000-000000000011");
    expect(sql).toContain("a1b00000-0000-4000-8000-000000000012");
    expect(sql).toContain("a1b00000-0000-4000-8000-000000000013");
    expect(sql).not.toContain("external_llm_v1");
    expect(sql).not.toContain('"apiKey"');
  });
  it("documents the same credentials in both login translations", () => {
    const welcome = configs.find((c) => c.localized).localized;
    for (const language of ["de", "en"]) {
      expect(welcome[language]).toContain("demo@aibox.test");
      expect(welcome[language]).toContain("Aibox-local-demo-2026!");
    }
    expect(sql).toContain("extensions.crypt('Aibox-local-demo-2026!'");
  });
});

it("provides a valid Trello example without shared credentials", () => {
  const sql = readFileSync(
    new URL("../../supabase/seed.sql", import.meta.url),
    "utf8",
  );
  const agent = agentConfigSchema.parse(
    JSON.parse(sql.match(/\$trello\$([\s\S]*?)\$trello\$/)![1]),
  );
  expect(agent.additionalFunctions).toMatchObject({
    fileUpload: false,
    batch: false,
    disappearingChats: "default-on",
  });
  expect(agent.roles[0].mcps?.[0]).toMatchObject({
    url: "https://mcp.trello.com/v1",
    headers: {},
  });
  expect(sql).not.toMatch(/INSERT INTO public\.mcp_oauth_sessions/i);
});

it("seed resources work with the unchanged realtime ID validation", async () => {
  const sql = readFileSync(
    new URL("../../supabase/seed.sql", import.meta.url),
    "utf8",
  );
  const rows = [
    ...sql.matchAll(
      /INSERT INTO public\.(organizations|transcribers|databases|chatbots) \(id,[\s\S]*?VALUES \('([^']+)'/g,
    ),
  ];
  expect(rows).toHaveLength(5);
  const workspaceId = rows.find((row) => row[1] === "organizations")![2];
  const activityId = "00000000-0000-4000-8000-000000000001";
  for (const [, table, id] of rows) {
    expect(id).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
    if (table === "organizations") continue;
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: { id }, error: null })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const supabase = { from: vi.fn(() => query) } as any;
    const documentName =
      table === "chatbots"
        ? `activity_chat_currentMessage___${activityId}_${id}`
        : table === "transcribers"
          ? `activity_transcription__${activityId}_${id}`
          : `storage___repo_${workspaceId}_${id}`;
    expect(
      await getRealtimeDocumentPermission(documentName, {
        supabase,
        userId: activityId,
      }),
    ).toBe(table === "chatbots" ? "read_write" : "read");
    expect(supabase.from).toHaveBeenCalled();
  }
  expect(sql).not.toMatch(/['"]seed-[a-z-]+['"]/);
});
