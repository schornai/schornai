import {
  appColorSchema,
  appIconSchema,
  imageSchema,
} from "../_shared/_schema.ts";
import { z } from "zod/mini";
import { normalizeWebDomain } from "./webAccess.ts";

const legacyChatbotModelSchema = z.union([
  z.object({
    featureVision: z.optional(z.boolean()),
    id: z.string(),
    identifier: z.string(),
    type: z.literal("ollama-model"),
  }),
  z.object({
    featureVision: z.optional(z.boolean()),
    id: z.string(),
    type: z.literal("ollama-model-v2"),
  }),
]);

const legacySimpleChatbotRoleSchema = z.object({
  model: legacyChatbotModelSchema,
  prompt: z.string(),
  temperature: z.number(),
  type: z.literal("simple-chatbot"),
});

const legacyMcpEndpointChatbotRoleSchema = z.object({
  mcpEndpointId: z.string(),
  model: legacyChatbotModelSchema,
  prompt: z.string(),
  temperature: z.number(),
  type: z.literal("mcp-endpoint-chatbot"),
});

const legacyDatabaseRetrivalAugmentedChatbotRoleSchema = z.object({
  databaseId: z.string(),
  model: legacyChatbotModelSchema,
  prompt: z.string(),
  promptNoRetrival: z.string(),
  temperature: z.number(),
  toolPermissions: z.optional(
    z.union([
      z.literal("read-only"),
      z.literal("confirm-write"),
      z.literal("write"),
    ]),
  ),
  type: z.literal("database-retrival-augmented-chatbot"),
});

const textFileRetrivalAugmentedChatbotRoleSchema = z.object({
  model: legacyChatbotModelSchema,
  prompt: z.string(),
  promptNoRetrival: z.string(),
  temperature: z.number(),
  type: z.literal("text-file-retrival-augmented-chatbot"),
});

const legacyChatbotRoleSchema = z.intersection(
  z.union([
    legacySimpleChatbotRoleSchema,
    legacyDatabaseRetrivalAugmentedChatbotRoleSchema,
    textFileRetrivalAugmentedChatbotRoleSchema,
    legacyMcpEndpointChatbotRoleSchema,
  ]),
  z.object({
    description: z.optional(z.string()),
    id: z.string(),
    name: z.optional(z.string()),
  }),
);

const legacyChatbotRolesSchema = z.array(legacyChatbotRoleSchema);

export const legacyChatbotRolesIdentifiedSchema = z.object({
  roles: legacyChatbotRolesSchema,
  supervisorModel: z.optional(legacyChatbotRoleSchema),
  supervisorTemperature: z._default(z.number(), 0),
  version: z.literal("chatbot-roles-version-3"),
});

export const recommendedMessageSchema = z.object({
  id: z.string(),
  label: z.optional(z.string()),
  message: z.string(),
});

export const legacyChatbotConfigSchema = z.object({
  color: appColorSchema,
  documentation: z.string(),
  icon: appIconSchema,
  image: z.optional(imageSchema),
  recommendedMessages: z.array(recommendedMessageSchema),
  version: z.literal("chatbot-config-version-3"),
});

const agentConfigModelThinkingSchema = z.union([
  z.literal("mandatory-on"),
  z.literal("optional-on"),
  z.literal("mandatory-off"),
  z.literal("optional-off"),
]);

export const webAccessConfigSchema = z
  .object({
    active: z.boolean(),
    webFetch: z.optional(
      z.union([z.literal("on"), z.literal("ask"), z.literal("off")]),
    ),
    webFetchAccess: z.union([z.literal("allow-all"), z.literal("allow-list")]),
    webFetchAllowList: z.array(z.string()),
    webSearchProvider: z.optional(z.enum(["brave", "staan"])),
    webSearchConnectionId: z.optional(z.string()),
    webSearchMarket: z.optional(z.string()),
    webSearch: z.optional(
      z.union([z.literal("on"), z.literal("ask"), z.literal("off")]),
    ),
  })
  .check(
    z.check((ctx) => {
      const config = ctx.value;
      if (!config.active) return;
      if (
        ["on", "ask"].includes(config.webFetch ?? "off") &&
        config.webFetchAccess === "allow-list" &&
        config.webFetchAllowList.some((domain) => !normalizeWebDomain(domain))
      ) {
        ctx.issues.push({
          code: "custom",
          input: config.webFetchAllowList,
          path: ["webFetchAllowList"],
          message:
            "Enter hostnames or *.example.com without protocols, paths or ports.",
        });
      }
    }),
  );

export const agentConfigSchema = z.object({
  additionalFunctions: z.object({
    batch: z._default(z.boolean(), true),
    disappearingChats: z._default(z.boolean(), true),
    fileUpload: z._default(z.boolean(), true),
    nightshift: z._default(z.boolean(), true),
    pursueGoal: z._default(z.boolean(), true),
  }),
  color: appColorSchema,
  documentation: z.string(),
  icon: appIconSchema,
  image: z.optional(imageSchema),
  modelIdentifier: z.string(),
  modelThinking: agentConfigModelThinkingSchema,
  recommendedMessages: z.array(recommendedMessageSchema),
  roles: z.array(
    z.object({
      documentRepositoryMounts: z.array(
        z.object({
          documentRepositoryIdentifier: z.string(),
          id: z.uuid(),
          mount: z._default(z.string(), "/default"),
          pathRepository: z._default(z.string(), "/"),
          permission: z.union([
            z.literal("read-only"),
            z.literal("confirm-write"),
            z.literal("write"),
          ]),
        }),
      ),

      // Todo: remove _default because its mandatory but my db is "corrupted"
      id: z._default(z.string(), crypto.randomUUID()),
      mcps: z.optional(
        z.array(
          z.object({
            oauthConnectionId: z.optional(z.string()),
            // null retains a stored value; strings are write-only replacements.
            headers: z.record(
              z.string().check(z.minLength(1)),
              z.nullable(z.string().check(z.minLength(1))),
            ),
            id: z.uuid(),
            name: z.optional(z.string()),
            type: z.literal("http"),
            url: z.url(),
          }),
        ),
      ),
      modelIdentifierOverride: z.optional(z.string()),
      modelThinkingOverride: z.optional(agentConfigModelThinkingSchema),
      name: z.optional(z.string()),
      prompt: z.string(),
      roleSelectionHint: z.optional(z.string()),
      toolCalculator: z.optional(
        z.object({
          active: z.boolean(),
        }),
      ),
      toolChatAwareness: z.optional(
        z.object({
          active: z.boolean(),
          recommendNextMessages: z.optional(z.boolean()),
          updateChatLabel: z.optional(z.boolean()),
        }),
      ),
      toolPlatformAccess: z.optional(
        z.object({
          active: z.boolean(),
          level: z.enum(["user", "editor", "workspace", "admin"]),
          approvals: z.optional(
            z.object({
              user: z.enum(["auto", "ask", "off"]),
              editor: z.enum(["auto", "ask", "off"]),
              workspace: z.enum(["auto", "ask", "off"]),
              admin: z.enum(["auto", "ask", "off"]),
            }),
          ),
        }),
      ),
      toolWebAccess: z.optional(webAccessConfigSchema),
    }),
  ),
  transcriberIdentifier: z.optional(z.string()),
  version: z.literal("agent-config-version-4"),
});

export const agentSchema = z.intersection(
  z.object({
    description: z.string(),
    id: z.string(),
    name: z.string(),
    workspaceId: z.string(),
  }),
  agentConfigSchema,
);

export const agentConfigSchemaWithLegacySupport = z.union([
  agentConfigSchema,
  legacyChatbotConfigSchema,
]);
