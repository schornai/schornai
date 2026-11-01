import {
  appColorSchema,
  appIconSchema,
  imageSchema,
} from "../_shared/_schema.ts";
import { z } from "zod/v4";

export const chatbotModelSchema = z.union([
  z.object({
    featureVision: z.boolean().optional(),
    id: z.string(),
    identifier: z.string(),
    type: z.literal("ollama-model"),
  }),
  z.object({
    featureVision: z.boolean().optional(),
    id: z.string(),
    type: z.literal("ollama-model-v2"),
  }),
]);

export const simpleChatbotRoleSchema = z.object({
  model: chatbotModelSchema,
  prompt: z.string(),
  temperature: z.number().min(0).max(1).default(0),
  type: z.literal("simple-chatbot"),
});

export const mcpEndpointChatbotRoleSchema = z.object({
  mcpEndpointId: z.string(),
  model: chatbotModelSchema,
  prompt: z.string(),
  temperature: z.number().min(0).max(1).default(0),
  type: z.literal("mcp-endpoint-chatbot"),
});

export const databaseRetrivalAugmentedChatbotRoleSchema = z.object({
  databaseId: z.string(),
  model: chatbotModelSchema,
  prompt: z.string(),
  promptNoRetrival: z.string(),
  temperature: z.number().min(0).max(1).default(0),
  toolPermissions: z
    .union([
      z.literal("read-only"),
      z.literal("confirm-write"),
      z.literal("write"),
    ])
    .optional(),
  type: z.literal("database-retrival-augmented-chatbot"),
});

export const textFileRetrivalAugmentedChatbotRoleSchema = z.object({
  model: chatbotModelSchema,
  prompt: z.string(),
  promptNoRetrival: z.string(),
  temperature: z.number().min(0).max(1).default(0),
  type: z.literal("text-file-retrival-augmented-chatbot"),
});

export const chatbotRoleSchema = z
  .union([
    simpleChatbotRoleSchema,
    databaseRetrivalAugmentedChatbotRoleSchema,
    textFileRetrivalAugmentedChatbotRoleSchema,
    mcpEndpointChatbotRoleSchema,
  ])
  .and(
    z.object({
      description: z.string().optional(),
      id: z.string(),
      name: z.string().optional(),
    }),
  );

export const chatbotRoleWithMandatoryDescriptionSchema = chatbotRoleSchema.and(
  z.object({
    description: z.string().min(3),
    name: z.string().min(3),
  }),
);

export const chatbotRolesSchema = z.array(chatbotRoleSchema);

export const chatbotRolesIdentifiedSchema = z.object({
  roles: chatbotRolesSchema,
  supervisorModel: chatbotModelSchema.optional(),
  supervisorTemperature: z.number().min(0).max(1).default(0),
  version: z.literal("chatbot-roles-version-3"),
});

export const chatbotRolesWithMandatoryDescriptionSchema = z
  .array(chatbotRoleWithMandatoryDescriptionSchema)
  .refine((roles) => new Set(roles.map((r) => r.name)).size === roles.length, {
    message: "unique_names",
    path: ["uniqueNames"],
  });

export const chatbotRecommendedMessageSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  message: z.string(),
});

export const chatbotRecommendedMessagesSchema = z.array(
  chatbotRecommendedMessageSchema,
);

export const chatbotConfigSchema = z.object({
  color: appColorSchema,
  documentation: z.string(),
  icon: appIconSchema,
  image: z.optional(imageSchema),
  recommendedMessages: chatbotRecommendedMessagesSchema,
  version: z.literal("chatbot-config-version-3"),
});

export const chatbotSchema = z.object({
  config: chatbotConfigSchema,
  description: z.string(),
  id: z.string(),
  name: z.string().min(3),
  organizationId: z.string(),
  roles: chatbotRolesIdentifiedSchema,
  visibility: z
    .union([z.literal("public"), z.literal("users"), z.literal("editors")])
    .refine((visibility) => (visibility === "public" ? "users" : visibility)),
});
