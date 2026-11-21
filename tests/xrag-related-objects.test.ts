import { beforeEach, expect, it, vi } from "vitest";
import { getXRAGRelatedObjects } from "../packages/database/src/xrag/getXRAGRelatedObjects.ts";
const calls = vi.hoisted(() => ({
  root: vi.fn(),
  agents: vi.fn(),
  repositories: vi.fn(),
  transcribers: vi.fn(),
  models: vi.fn(),
  model: vi.fn(),
}));
vi.mock("../packages/database/src/agent/getAgents.ts", () => ({
  getAgents: calls.agents,
}));
vi.mock("../packages/database/src/xrag/getAuthorizedResource.ts", () => ({
  getAuthorizedResource: calls.root,
}));
vi.mock(
  "../packages/database/src/documentRepositories/getDocumentRepositories.ts",
  () => ({ getDocumentRepositories: calls.repositories }),
);
vi.mock("../packages/database/src/transcriber/getTranscribers.ts", () => ({
  getTranscribers: calls.transcribers,
}));
vi.mock("../packages/database/src/aiModel/getAIModels.ts", () => ({
  getAIModels: calls.models,
}));
vi.mock("../packages/database/src/aiModel/getAIModelById.ts", () => ({
  getAIModelById: calls.model,
}));
const options = {
  supabase: {},
  authenticated: {
    userId: "owner",
    claims: [{ organization_id: "workspace", role: "workspace-admin" }],
  },
} as any;
const repository = (id = "docs", workspaceId = "workspace") => ({
  id,
  workspaceId,
  identifier: `runtime-${id}`,
  type: "database-v2",
  name: `Files ${id}`,
  description: "Files",
  transcriberIdentifier: "runtime-speech",
  index: {
    embedding: {
      active: true,
      modelIdentifier: "embedding",
      modelVectorSize: 768,
    },
  },
});
const transcriber = {
  id: "speech",
  workspaceId: "workspace",
  identifier: "runtime-speech",
  version: "transcriber-v2",
  name: "Speech",
  modelIdentifier: "whisper",
};
function agent() {
  return {
    id: "agent",
    workspaceId: "workspace",
    name: "Agent",
    description: "",
    version: "agent-config-version-4",
    additionalFunctions: {},
    color: { type: "color-oklch-hue", oklchHue: 120 },
    icon: { type: "icon-lucide", iconName: "bot" },
    documentation: "",
    recommendedMessages: [],
    modelIdentifier: "llm",
    modelThinking: "optional-on",
    transcriberIdentifier: "runtime-speech",
    roles: [
      {
        id: "role",
        prompt: "Help",
        documentRepositoryMounts: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            documentRepositoryIdentifier: "runtime-docs",
            permission: "read-only",
          },
        ],
      },
    ],
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  calls.root.mockResolvedValue(agent());
  calls.repositories.mockResolvedValue([repository()]);
  calls.transcribers.mockResolvedValue([transcriber]);
  calls.models.mockResolvedValue([
    { id: "model-llm", identifier: "llm", name: "LLM", type: "ollama_llm_v1" },
    {
      id: "model-embedding",
      identifier: "embedding",
      name: "Embedding",
      type: "ollama_embedding_v1",
    },
    {
      id: "model-whisper",
      identifier: "whisper",
      name: "Whisper",
      type: "mlx_whisper_v1",
    },
  ]);
});
it("resolves direct and transitive references to database IDs, deduplicating shared models and transcribers", async () => {
  const choices = await getXRAGRelatedObjects(
    { kind: "agent", id: "agent" },
    options,
  );
  expect(choices).toEqual([
    { kind: "documentRepository", id: "docs", name: "Files docs" },
    { kind: "model", id: "model-embedding", name: "Embedding" },
    { kind: "model", id: "model-llm", name: "LLM" },
    { kind: "model", id: "model-whisper", name: "Whisper" },
    { kind: "transcriber", id: "speech", name: "Speech" },
  ]);
  expect(calls.models).toHaveBeenCalledTimes(1);
  expect(calls.transcribers).toHaveBeenCalledTimes(1);
  expect(calls.repositories).toHaveBeenCalledTimes(1);
  expect(
    choices.every(
      (choice) => Object.keys(choice).sort().join() === "id,kind,name",
    ),
  ).toBe(true);
});
it("omits resources outside the caller's administered workspaces and their private dependencies", async () => {
  calls.repositories.mockResolvedValue([repository("docs", "other")]);
  const choices = await getXRAGRelatedObjects(
    { kind: "agent", id: "agent" },
    options,
  );
  expect(choices.map((choice) => choice.id)).toEqual([
    "model-llm",
    "model-whisper",
    "speech",
  ]);
});
it("allows global administrators to include connected resources across workspaces", async () => {
  calls.repositories.mockResolvedValue([repository("docs", "other")]);
  expect(
    await getXRAGRelatedObjects(
      { kind: "agent", id: "agent" },
      { ...options, authenticated: { userId: "owner", claims: "admin" } },
    ),
  ).toContainEqual({
    kind: "documentRepository",
    id: "docs",
    name: "Files docs",
  });
});
it("does not offer missing references or external API models as portable archives", async () => {
  calls.repositories.mockResolvedValue([]);
  calls.transcribers.mockResolvedValue([]);
  calls.models.mockResolvedValue([
    {
      id: "remote",
      identifier: "llm",
      name: "External",
      type: "external_llm_v1",
    },
  ]);
  expect(
    await getXRAGRelatedObjects({ kind: "agent", id: "agent" }, options),
  ).toEqual([]);
});
it("finds repository and transcriber connections without requiring an agent", async () => {
  calls.root.mockResolvedValueOnce(repository());
  expect(
    (
      await getXRAGRelatedObjects(
        { kind: "documentRepository", id: "docs" },
        options,
      )
    ).map((item) => item.id),
  ).toEqual(["model-embedding", "model-whisper", "speech"]);
  calls.root.mockResolvedValueOnce(transcriber);
  expect(
    await getXRAGRelatedObjects({ kind: "transcriber", id: "speech" }, options),
  ).toEqual([{ kind: "model", id: "model-whisper", name: "Whisper" }]);
});
it("returns no dependencies for an authorized model and rejects insufficient roles first", async () => {
  calls.model.mockResolvedValue({ id: "model" });
  expect(
    await getXRAGRelatedObjects({ kind: "model", id: "model" }, options),
  ).toEqual([]);
  expect(calls.model).toHaveBeenCalledWith("model", options);
  calls.model.mockClear();
  await expect(
    getXRAGRelatedObjects(
      { kind: "model", id: "model" },
      {
        ...options,
        authenticated: {
          userId: "owner",
          claims: [{ organization_id: "workspace", role: "editor" }],
        },
      },
    ),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(calls.model).not.toHaveBeenCalled();
});
it("does not enumerate anything after root authorization or a data read fails", async () => {
  calls.root.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  await expect(
    getXRAGRelatedObjects({ kind: "agent", id: "agent" }, options),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(calls.models).not.toHaveBeenCalled();
  calls.models.mockRejectedValueOnce(new Error("read failed"));
  await expect(
    getXRAGRelatedObjects({ kind: "agent", id: "agent" }, options),
  ).rejects.toThrow("read failed");
});
it("bounds large dependency graphs rather than returning incomplete choices", async () => {
  const root = agent();
  root.roles[0]!.documentRepositoryMounts = Array.from(
    { length: 1000 },
    (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      documentRepositoryIdentifier: `runtime-${i}`,
      permission: "read-only",
    }),
  );
  calls.root.mockResolvedValue(root);
  calls.repositories.mockResolvedValue(
    Array.from({ length: 1000 }, (_, i) => repository(String(i))),
  );
  await expect(
    getXRAGRelatedObjects({ kind: "agent", id: "agent" }, options),
  ).rejects.toThrow("XRAG_PACKAGE_SIZE");
});

it("offers the automation's agent and its transitive connections without duplicates", async () => {
  calls.root.mockResolvedValue({
    name: "Check",
    agentId: "agent",
    message: "Check",
    enabled: false,
    trigger: {
      type: "storage",
      storage: { type: "documentRepository", documentRepositoryId: "docs" },
      events: ["uploaded"],
      folder: "/",
      includeSubfolders: true,
      attachment: "none",
    },
  });
  calls.agents.mockResolvedValue([agent()]);
  const choices = await getXRAGRelatedObjects(
    { kind: "automation", id: "automation" },
    options,
  );
  expect(choices).toContainEqual({ kind: "agent", id: "agent", name: "Agent" });
  expect(choices.filter((choice) => choice.id === "docs")).toHaveLength(1);
  expect(choices).toContainEqual({
    kind: "model",
    id: "model-whisper",
    name: "Whisper",
  });
});
