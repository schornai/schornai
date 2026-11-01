import type { LanguageModel, ModelMessage } from "ai";
import { Output, generateText } from "ai";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import { getReasoning } from "../_utils/getReasoning.ts";
import { isToolUIPart } from "ai";
import { z } from "zod/mini";

export async function selectRole(
  agent: Agent,
  messages: ModelMessage[],
  {
    model,
    thinking,
  }: {
    model: LanguageModel;
    thinking?: boolean;
  },
  {
    abortSignal,
    chatMessages,
  }: {
    abortSignal?: AbortSignal;
    chatMessages?: ChatMessage[];
  },
) {
  const [firstRole, ...additionalRoles] = agent.roles;

  if (!firstRole) {
    throw new Error("ROLE_NOT_FOUND");
  }

  const lastMessage = messages.at(-1);
  const approvalResponses =
    lastMessage?.role === "tool"
      ? lastMessage.content.filter(
          (part) => part.type === "tool-approval-response",
        )
      : [];

  if (approvalResponses.length > 0) {
    const approvalRoles = approvalResponses.map(({ approvalId }) => {
      const sourceMessage = chatMessages?.findLast(
        (message) =>
          message.role === "assistant" &&
          message.parts.some(
            (part) => isToolUIPart(part) && part.approval?.id === approvalId,
          ),
      );
      const selectedRolePart = sourceMessage?.parts.findLast(
        (part) => part.type === "data-role" && part.data.state === "selected",
      );
      const roleId = sourceMessage?.metadata?.roleId;
      const roleName =
        sourceMessage?.metadata?.roleName ??
        (selectedRolePart?.type === "data-role" &&
        selectedRolePart.data.state === "selected"
          ? selectedRolePart.data.roleName
          : undefined);
      const roleById = roleId
        ? agent.roles.find((role) => role.id === roleId)
        : undefined;
      if (roleById) return roleById;
      const rolesByName = roleName
        ? agent.roles.filter((role) => role.name === roleName)
        : [];
      if (rolesByName.length === 1) return rolesByName[0]!;
      // Older chats with a single role have no saved selection to recover.
      if (!roleId && !roleName && additionalRoles.length === 0)
        return firstRole;
      throw new Error("TOOL_APPROVAL_ROLE_NOT_FOUND");
    });
    const [approvalRole] = approvalRoles;
    if (
      !approvalRole ||
      approvalRoles.some((role) => role.id !== approvalRole.id)
    ) {
      throw new Error("TOOL_APPROVAL_ROLES_MISMATCH");
    }
    return approvalRole;
  }

  if (additionalRoles.length === 0) {
    return firstRole;
  }

  const roleNames = agent.roles.map((role) => `"${role.name}"`).join(", ");

  const roleDefinitions = agent.roles
    .map(
      (role) =>
        `- Name: ${role.name}\n  Expertise/Trigger: ${role.roleSelectionHint}`,
    )
    .join("\n\n");

  const instructions = `
You are a specialized Routing Agent. Your sole purpose is to analyze the user's current intent and select the most appropriate expert role from the provided list to handle the request.

### Available Roles:
${roleDefinitions}

### Selection Criteria:
1. Analyze the last message in the conversation history to identify the primary goal, tone, and technical requirements of the user.
2. Match these requirements against the "Expertise/Trigger" hints provided for each role.
3. If multiple roles seem applicable, choose the one that is most specific to the request.
4. If no role fits perfectly, select the most general-purpose role or the one that comes closest to the intent.

### Constraints:
- You MUST return only a role name from the following list: [${roleNames}].
- Do not invent new roles.
- Your decision must be based strictly on the provided selection hints and the conversation context.
      `.trim();

  const result = await generateText({
    abortSignal,
    instructions,
    messages,
    model,
    output: Output.object({
      schema: z.object({
        roleName: z
          .string()
          .check(
            z.describe(
              `The exact name of the selected role from the list: ${roleNames}`,
            ),
          ),
      }),
    }),
    reasoning: getReasoning(agent.modelThinking, thinking),
  });

  const selectedRole = agent.roles.find(
    (role) => role.name === result?.output.roleName,
  );

  if (!selectedRole) {
    throw new Error("ROLE_NOT_FOUND");
  }

  return selectedRole;
}
