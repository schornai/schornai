import { describe, expect, it } from "vitest";
import {
  chatbotRolesWithMandatoryDescriptionSchema,
  chatbotSchema,
} from "../packages/database/src/chatbot/_schemas";
import {
  chatBodySchema,
  validateChatMessages,
} from "../packages/database/src/chat/_schema";
const role = {
  id: "role",
  name: "Writer",
  description: "Writes text",
  type: "simple-chatbot",
  prompt: "",
  model: { type: "ollama-model", id: "model", identifier: "model" },
};
describe("imported legacy configuration and current chat schemas", () => {
  it("requires distinct descriptive names for roles", () => {
    expect(
      chatbotRolesWithMandatoryDescriptionSchema.parse([role])[0]?.temperature,
    ).toBe(0);
    expect(
      chatbotRolesWithMandatoryDescriptionSchema.safeParse([
        role,
        { ...role, id: "other" },
      ]).success,
    ).toBe(false);
    expect(
      chatbotRolesWithMandatoryDescriptionSchema.safeParse([
        { ...role, name: "x" },
      ]).success,
    ).toBe(false);
  });
  it.each(["public", "users", "editors"])(
    "validates legacy chatbot visibility %s",
    (visibility) => {
      const chatbot = {
        id: "agent",
        name: "Agent",
        description: "",
        organizationId: "workspace",
        visibility,
        config: {
          version: "chatbot-config-version-3",
          color: { type: "color-oklch-hue", oklchHue: 42 },
          icon: { type: "icon-lucide", iconName: "bot" },
          documentation: "",
          recommendedMessages: [],
        },
        roles: { version: "chatbot-roles-version-3", roles: [role] },
      };
      expect(chatbotSchema.parse(chatbot).visibility).toBe(visibility);
    },
  );
  it("validates typed file and role data and rejects malformed data parts", async () => {
    const messages = [
      {
        id: "user",
        role: "user",
        parts: [
          { type: "text", text: "Question" },
          {
            type: "data-file",
            data: {
              id: "file",
              name: "file.txt",
              type: "text/plain",
              url: "file.txt",
            },
          },
          {
            type: "data-role",
            data: { state: "selected", roleName: "Writer" },
          },
        ],
      },
    ];
    expect(await validateChatMessages(messages)).toEqual(messages);
    await expect(
      validateChatMessages([
        { ...messages[0], parts: [{ type: "data-file", data: { id: 1 } }] },
      ]),
    ).rejects.toThrow();
    const result = await chatBodySchema.parseAsync({
      chatbotId: "agent",
      features: { thinking: true, deepResearch: false },
      messages,
    });
    expect(result.messages).toEqual(messages);
  });
});
