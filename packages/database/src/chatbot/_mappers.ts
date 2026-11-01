import type { Chatbot, ChatbotConfig, ChatbotDatabaseRow } from "./_types.ts";

export function mapChatbot(dbChatbot: ChatbotDatabaseRow): Chatbot {
  return {
    config: dbChatbot.config as ChatbotConfig,
    description: dbChatbot.description,
    id: dbChatbot.id,
    name: dbChatbot.name,
    organization: undefined, // todo
    organizationId: dbChatbot.organization_id,
    roles: dbChatbot.roles as Chatbot["roles"],
    visibility: dbChatbot.visibility,
  };
}
