import { describe, expect, it } from "vitest";
import { database } from "./helpers/supabase";
import {
  mapAgent,
  mapAgentWithLegacySupportCleanUp,
} from "../packages/database/src/agent/_mappers";
import {
  mapTranscriber,
  mapTranscriberWithLegacySupport,
} from "../packages/database/src/transcriber/_mappers";
import {
  mapDocumentRepository,
  mapDocumentRepositoryWithLegacySupportCleanUp,
} from "../packages/database/src/documentRepositories/_mappers";
import { getAgents } from "../packages/database/src/agent/getAgents";
import { getAgentsByIds } from "../packages/database/src/agent/getAgentsByIds";
import { getAgentById } from "../packages/database/src/agent/getAgentById";
import { getTranscribers } from "../packages/database/src/transcriber/getTranscribers";
import { getTranscribersByIds } from "../packages/database/src/transcriber/getTranscribersByIds";
import { getTranscriberById } from "../packages/database/src/transcriber/getTranscriberById";
import { getDocumentRepositories } from "../packages/database/src/documentRepositories/getDocumentRepositories";
import { getDocumentRepositoriesByIds } from "../packages/database/src/documentRepositories/getDocumentRepositoriesByIds";
import { getDocumentRepositoryById } from "../packages/database/src/documentRepositories/getDocumentRepositoryById";
import { getDocumentRepositorityByIdentifiers } from "../packages/database/src/documentRepositories/getDocumentRepositorityByIdentifiers";

const appearance = {
  color: { type: "color-oklch-hue", oklchHue: 100 },
  icon: { type: "icon-lucide", iconName: "bot" },
  documentation: "Documentation",
  recommendedMessages: [],
};
const agentConfig = {
  ...appearance,
  version: "agent-config-version-4",
  modelIdentifier: "model",
  modelThinking: "optional-on",
  additionalFunctions: {
    batch: true,
    disappearingChats: false,
    fileUpload: true,
    nightshift: false,
    pursueGoal: true,
  },
  roles: [],
};
const row = {
  id: "id",
  name: "Name",
  description: "Description",
  organization_id: "workspace",
};
const agentRow = { ...row, config: agentConfig };
const repoRow = { ...row, config: { type: "database-v2", identifier: "repo" } };
const transcriberRow = {
  ...row,
  config: { modelIdentifier: "model" },
  ai_model_id: null,
  prompt: null,
};
const modelRow = {
  id: "model",
  identifier: "model",
  name: "Model",
  type: "ollama_llm_v1",
  config: { ollamaIdentifier: "model" },
  created_at: "2026-01-01",
};

describe("entity mappers and legacy migration", () => {
  it("maps current agents and bypasses migration writes", async () => {
    const { supabase } = database();
    expect(mapAgent(agentRow as any)).toEqual({
      ...agentConfig,
      ...{
        id: row.id,
        name: row.name,
        description: row.description,
        workspaceId: row.organization_id,
      },
    });
    expect(
      await mapAgentWithLegacySupportCleanUp(
        agentRow as any,
        { supabase } as any,
      ),
    ).toEqual(mapAgent(agentRow as any));
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it("migrates missing legacy roles using safe defaults", async () => {
    const { supabase, builders } = database({ chatbots: { data: null } });
    const migrated = await mapAgentWithLegacySupportCleanUp(
      {
        ...row,
        config: { ...appearance, version: "chatbot-config-version-3" },
        roles: {},
      } as any,
      { supabase } as any,
    );
    expect(migrated).toMatchObject({
      modelIdentifier: "unknown",
      modelThinking: "optional-on",
      roles: [],
      version: "agent-config-version-4",
    });
    expect(builders.chatbots!.update).toHaveBeenCalledWith({
      config: expect.objectContaining({ version: "agent-config-version-4" }),
    });
    expect(builders.chatbots!.eq).toHaveBeenCalledWith("id", "id");
  });
  it.each([
    "simple-chatbot",
    "database-retrival-augmented-chatbot",
    "text-file-retrival-augmented-chatbot",
    "mcp-endpoint-chatbot",
  ])("migrates %s roles", async (type) => {
    const { supabase } = database({
      ai_models: { data: modelRow },
      chatbots: { data: null },
    });
    const role = {
      id: "role",
      name: "Role",
      description: "Hint",
      type,
      model: { id: "model", type: "ollama-model-v2" },
      prompt: "Prompt",
      promptNoRetrival: "No retrieval",
      temperature: 0.5,
      databaseId: "repo",
      mcpEndpointId: "mcp",
    };
    const legacy = {
      ...row,
      config: { ...appearance, version: "chatbot-config-version-3" },
      roles: { version: "chatbot-roles-version-3", roles: [role] },
    };
    const migrated = await mapAgentWithLegacySupportCleanUp(
      legacy as any,
      { supabase } as any,
    );
    expect(migrated.modelIdentifier).toBe("model");
    expect(migrated.roles[0]).toMatchObject({
      id: expect.any(String),
      name: "Role",
      prompt: "Prompt",
      roleSelectionHint: "Hint",
    });
    expect(migrated.roles[0]!.documentRepositoryMounts).toHaveLength(
      type === "database-retrival-augmented-chatbot" ? 1 : 0,
    );
    if (type === "database-retrival-augmented-chatbot")
      expect(migrated.roles[0]!.documentRepositoryMounts[0]).toMatchObject({
        documentRepositoryIdentifier: "repo",
        permission: "read-only",
        mount: "default",
      });
  });
  it("uses a supervisor model and resolves per-role overrides, tolerating unavailable legacy models", async () => {
    const { supabase } = database({
      ai_models: { data: modelRow },
      chatbots: { data: null },
    });
    const role = {
      id: "role",
      type: "simple-chatbot",
      model: { id: "different", type: "ollama-model-v2" },
      prompt: "",
      temperature: 0,
    };
    const legacy = {
      ...row,
      config: { ...appearance, version: "chatbot-config-version-3" },
      roles: {
        version: "chatbot-roles-version-3",
        roles: [role],
        supervisorModel: {
          ...role,
          model: { id: "model", type: "ollama-model-v2" },
        },
      },
    };
    expect(
      (
        await mapAgentWithLegacySupportCleanUp(
          legacy as any,
          { supabase } as any,
        )
      ).roles[0]!.modelIdentifierOverride,
    ).toBe("model");
    const failed = database({
      ai_models: { error: new Error("missing model") },
      chatbots: { data: null },
    });
    expect(
      (
        await mapAgentWithLegacySupportCleanUp(
          legacy as any,
          { supabase: failed.supabase } as any,
        )
      ).modelIdentifier,
    ).toBe("unknown");
  });
  it("maps transcriber nullability and persists legacy model migrations", async () => {
    expect(
      mapTranscriber({
        ...transcriberRow,
        config: { ...transcriberRow.config, retryLevel: "balanced" },
      } as any).retryLevel,
    ).toBe("balanced");
    expect(mapTranscriber(transcriberRow as any)).toMatchObject({
      identifier: "id",
      modelIdentifier: "model",
      prompt: undefined,
    });
    expect(
      mapTranscriber({
        ...transcriberRow,
        name: null,
        description: null,
        config: { identifier: "custom" },
      } as any),
    ).toMatchObject({ name: "", description: undefined, identifier: "custom" });
    const { supabase, builders } = database({
      ai_models: { data: modelRow },
      transcribers: { data: null },
    });
    expect(
      await mapTranscriberWithLegacySupport(
        transcriberRow as any,
        { supabase } as any,
      ),
    ).toMatchObject({ identifier: "id" });
    expect(
      await mapTranscriberWithLegacySupport(
        { ...transcriberRow, ai_model_id: "model" } as any,
        { supabase } as any,
      ),
    ).toMatchObject({ modelIdentifier: "model", identifier: "id" });
    expect(builders.transcribers!.update).toHaveBeenCalledWith({
      ai_model_id: null,
      config: { identifier: "id", modelIdentifier: "model" },
    });
    const failed = database({
      ai_models: { error: new Error("missing") },
      transcribers: { data: null },
    });
    expect(
      (
        await mapTranscriberWithLegacySupport(
          { ...transcriberRow, ai_model_id: "model" } as any,
          { supabase: failed.supabase } as any,
        )
      ).modelIdentifier,
    ).toBeUndefined();
  });
  it("maps current and legacy document repositories, including missing workspace IDs", async () => {
    expect(mapDocumentRepository(repoRow as any)).toMatchObject({
      identifier: "repo",
      workspaceId: "workspace",
    });
    expect(
      mapDocumentRepository({ ...repoRow, organization_id: null } as any)
        .workspaceId,
    ).toBe("not_set");
    const { supabase } = database();
    expect(
      await mapDocumentRepositoryWithLegacySupportCleanUp(
        repoRow as any,
        { supabase } as any,
      ),
    ).toEqual(mapDocumentRepository(repoRow as any));
    expect(
      await mapDocumentRepositoryWithLegacySupportCleanUp(
        {
          ...row,
          organization_id: null,
          config: { type: "text-files", keyword: true },
        } as any,
        { supabase } as any,
      ),
    ).toMatchObject({
      identifier: "id",
      workspaceId: "not_set",
      index: { keyword: { active: true } },
    });
    expect(
      await mapDocumentRepositoryWithLegacySupportCleanUp(
        { ...row, config: "bad" } as any,
        { supabase } as any,
      ),
    ).toMatchObject({ index: { embedding: undefined, keyword: undefined } });
  });
  it.each([384, undefined])(
    "migrates embedding config with vector size %s",
    async (size) => {
      const { supabase } = database({
        ai_models: {
          data: {
            ...modelRow,
            type: "ollama_embedding_v1",
            config: {
              ollamaIdentifier: "embed",
              ...(size ? { embeddingVectorSize: size } : {}),
            },
          },
        },
      });
      const legacy = {
        ...row,
        config: {
          type: "text-files",
          embedding: {
            model: { id: "model", type: "ollama-embedding-model-v2" },
          },
        },
      };
      expect(
        await mapDocumentRepositoryWithLegacySupportCleanUp(
          legacy as any,
          { supabase } as any,
        ),
      ).toMatchObject({
        index: {
          embedding: {
            active: true,
            modelIdentifier: "embed",
            modelVectorSize: size ?? 768,
          },
        },
      });
    },
  );
});

const readers = [
  ["chatbots", agentRow, getAgents, getAgentsByIds, getAgentById],
  [
    "databases",
    repoRow,
    getDocumentRepositories,
    getDocumentRepositoriesByIds,
    getDocumentRepositoryById,
  ],
  [
    "transcribers",
    transcriberRow,
    getTranscribers,
    getTranscribersByIds,
    getTranscriberById,
  ],
] as const;
describe.each(readers)(
  "%s queries",
  (table, entity, readAll, readIds, readOne) => {
    it("maps all and filtered rows and scopes single lookups by ID", async () => {
      const { supabase, builders } = database({ [table]: { data: [entity] } });
      expect(await readAll({ supabase } as any)).toHaveLength(1);
      expect(await readIds(["id"], { supabase } as any)).toHaveLength(1);
      expect(builders[table]!.in).toHaveBeenCalledWith("id", ["id"]);
      const single = database({ [table]: { data: entity } });
      expect(
        await readOne("id", { supabase: single.supabase } as any),
      ).toMatchObject({ id: "id" });
      expect(single.builders[table]!.eq).toHaveBeenCalledWith("id", "id");
    });
    it("propagates database errors and handles empty results", async () => {
      expect(
        await readAll({
          supabase: database({ [table]: { data: [] } }).supabase,
        } as any),
      ).toEqual([]);
      const error = new Error("read failed");
      await expect(
        readOne("id", {
          supabase: database({ [table]: { error } }).supabase,
        } as any),
      ).rejects.toBe(error);
    });
  },
);

it("looks up repositories by identifier without requiring an abort signal", async () => {
  const { supabase, builders } = database({ databases: { data: [repoRow] } });
  expect(
    await getDocumentRepositorityByIdentifiers(["repo"], { supabase } as any),
  ).toHaveLength(1);
  expect(builders.databases!.in).toHaveBeenCalledWith("config->>identifier", [
    "repo",
  ]);
});
