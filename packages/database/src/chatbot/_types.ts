import type {
  chatbotConfigSchema,
  chatbotModelSchema,
  chatbotRecommendedMessageSchema,
  chatbotRoleSchema,
  chatbotRoleWithMandatoryDescriptionSchema,
  chatbotRolesIdentifiedSchema,
  chatbotRolesSchema,
  chatbotSchema,
  databaseRetrivalAugmentedChatbotRoleSchema,
  mcpEndpointChatbotRoleSchema,
  simpleChatbotRoleSchema,
  textFileRetrivalAugmentedChatbotRoleSchema,
} from "./_schemas.ts";
import type { Database } from "../_shared/_supabase.ts";

import type z from "zod/v4";

export type ChatbotDatabaseRow =
  Database["public"]["Tables"]["chatbots"]["Row"];

export type ChatbotModel = z.infer<typeof chatbotModelSchema>;
export type SimpleChatbotRole = z.infer<typeof simpleChatbotRoleSchema>;
export type MCPEndpointChatbotRole = z.infer<
  typeof mcpEndpointChatbotRoleSchema
>;
export type DatabaseRetrivalAugmentedChatbotRole = z.infer<
  typeof databaseRetrivalAugmentedChatbotRoleSchema
>;
export type TextFileRetrivalAugmentedChatbotRole = z.infer<
  typeof textFileRetrivalAugmentedChatbotRoleSchema
>;
export type ChatbotRole = z.infer<typeof chatbotRoleSchema>;
export type ChatbotRoleWithMandatoryDescription = z.infer<
  typeof chatbotRoleWithMandatoryDescriptionSchema
>;
export type ChatbotRoles = z.infer<typeof chatbotRolesSchema>;
export type ChatbotRolesIdentified = z.infer<
  typeof chatbotRolesIdentifiedSchema
>;
export type ChatbotRecommendedMessage = z.infer<
  typeof chatbotRecommendedMessageSchema
>;
export type ChatbotConfig = z.infer<typeof chatbotConfigSchema>;
export type Chatbot = z.infer<typeof chatbotSchema> & {
  organization?: unknown;
};
