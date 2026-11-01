import type { Agent, ChatbotDatabaseRow } from "./_types.ts";
import {
  agentConfigSchema,
  agentConfigSchemaWithLegacySupport,
  legacyChatbotRolesIdentifiedSchema,
} from "./_schemas.ts";
import type { AIModel } from "../aiModel/_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getAIModelById } from "../aiModel/getAIModelById.ts";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
import type { z } from "zod/mini";

const tryGetAIModelById = (...params: Parameters<typeof getAIModelById>) =>
  tryAsync(() => getAIModelById(...params));

async function getChatbotModel(
  dbChatbot: ChatbotDatabaseRow,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  const { data: legacyRoles } = legacyChatbotRolesIdentifiedSchema.safeParse(
    dbChatbot.roles,
  );

  const modelId =
    legacyRoles?.supervisorModel?.id ?? legacyRoles?.roles[0]?.model.id;
  // console.log(modelId, legacyRoles);
  if (!modelId) {
    return undefined;
  }

  const model = await tryGetAIModelById(modelId, { supabase });

  return model.data;
}

async function migrateChatbotRolesToAgent(
  dbChatbot: ChatbotDatabaseRow,
  defaultModel: AIModel | undefined,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  const { data: legacyRoles } = legacyChatbotRolesIdentifiedSchema.safeParse(
    dbChatbot.roles,
  );

  const roles: Agent["roles"] = await Promise.all(
    legacyRoles?.roles.map(async (legacyRole) => {
      switch (legacyRole.type) {
        case "database-retrival-augmented-chatbot":
          return {
            documentRepositoryMounts: [
              {
                documentRepositoryIdentifier: legacyRole.databaseId,
                id: crypto.randomUUID(),
                mount: "default",
                pathRepository: "",
                permission: legacyRole.toolPermissions ?? "read-only",
              },
            ],
            id: crypto.randomUUID(),
            modelIdentifierOverride:
              legacyRole.model.id !== defaultModel?.id
                ? (await tryGetAIModelById(legacyRole.model.id, { supabase }))
                    .data?.identifier
                : undefined,
            name: legacyRole.name,
            prompt: legacyRole.prompt,
            roleSelectionHint: legacyRole.description,
          } satisfies Agent["roles"][number];
        case "mcp-endpoint-chatbot":
        case "text-file-retrival-augmented-chatbot":
        case "simple-chatbot":
          return {
            documentRepositoryMounts: [],
            id: crypto.randomUUID(),
            modelIdentifierOverride:
              legacyRole.model.id !== defaultModel?.id
                ? (await tryGetAIModelById(legacyRole.model.id, { supabase }))
                    .data?.identifier
                : undefined,
            name: legacyRole.name,
            prompt: legacyRole.prompt,
            roleSelectionHint: legacyRole.description,
          };
      }
    }) ?? [],
  );

  return roles;
}

export function mapAgent(dbChatbot: ChatbotDatabaseRow): Agent {
  const config = agentConfigSchema.parse(dbChatbot.config);

  return {
    ...config,
    description: dbChatbot.description,
    id: dbChatbot.id,
    name: dbChatbot.name,
    workspaceId: dbChatbot.organization_id,
  };
}

export async function mapAgentWithLegacySupportCleanUp(
  dbChatbot: ChatbotDatabaseRow,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
): Promise<Agent> {
  const config = agentConfigSchemaWithLegacySupport.parse(dbChatbot.config);

  if (config?.version === "agent-config-version-4") {
    return mapAgent(dbChatbot);
  }

  // Legacy support

  const defaultModel = await getChatbotModel(dbChatbot, { supabase });
  const newConfig: z.infer<typeof agentConfigSchema> = {
    additionalFunctions: {
      batch: true,
      disappearingChats: true,
      fileUpload: true,
      nightshift: true,
      pursueGoal: true,
    },
    color: config.color,
    documentation: config.documentation,
    icon: config.icon,
    image: config.image,
    modelIdentifier: defaultModel?.identifier ?? "unknown",
    modelThinking: "optional-on",
    recommendedMessages: config.recommendedMessages,
    roles: await migrateChatbotRolesToAgent(dbChatbot, defaultModel, {
      supabase,
    }),
    version: "agent-config-version-4",
  };

  await supabase
    .from("chatbots")
    .update({ config: newConfig })
    .eq("id", dbChatbot.id);

  return {
    ...newConfig,
    description: dbChatbot.description,
    id: dbChatbot.id,
    name: dbChatbot.name,
    workspaceId: dbChatbot.organization_id,
  };
}
