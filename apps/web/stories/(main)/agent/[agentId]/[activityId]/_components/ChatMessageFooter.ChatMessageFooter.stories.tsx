import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessageFooter } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessageFooter";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessageFooter",
  component: ChatMessageFooter,
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      role: "user",
      metadata: {
        roleName: "Beispiel",
        roleId: "11111111-1111-4111-8111-111111111111",
        thinking: false,
        timing: { inputDuration: 1, outputDuration: 1, totalDuration: 1 },
        usage: {
          inputTokens: 1,
          inputTokenDetails: {
            noCacheTokens: 1,
            cacheReadTokens: 1,
            cacheWriteTokens: 1,
          },
          outputTokens: 1,
          outputTokenDetails: { textTokens: 1, reasoningTokens: 1 },
          totalTokens: 1,
          raw: {},
        },
      },
      parts: [
        {
          type: "text",
          text: "Eine Beispielnachricht.",
          state: "streaming",
          providerMetadata: {},
        },
      ],
    },
  },
} satisfies Meta<typeof ChatMessageFooter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Message_role_user: Story = { args: {} };
export const Message_role_system: Story = {
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      role: "system",
      metadata: {
        roleName: "Beispiel",
        roleId: "11111111-1111-4111-8111-111111111111",
        thinking: false,
        timing: { inputDuration: 1, outputDuration: 1, totalDuration: 1 },
        usage: {
          inputTokens: 1,
          inputTokenDetails: {
            noCacheTokens: 1,
            cacheReadTokens: 1,
            cacheWriteTokens: 1,
          },
          outputTokens: 1,
          outputTokenDetails: { textTokens: 1, reasoningTokens: 1 },
          totalTokens: 1,
          raw: {},
        },
      },
      parts: [
        {
          type: "text",
          text: "Eine Beispielnachricht.",
          state: "streaming",
          providerMetadata: {},
        },
      ],
    },
  },
};
export const Message_role_assistant: Story = {
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      role: "assistant",
      metadata: {
        roleName: "Beispiel",
        roleId: "11111111-1111-4111-8111-111111111111",
        thinking: false,
        timing: { inputDuration: 1, outputDuration: 1, totalDuration: 1 },
        usage: {
          inputTokens: 1,
          inputTokenDetails: {
            noCacheTokens: 1,
            cacheReadTokens: 1,
            cacheWriteTokens: 1,
          },
          outputTokens: 1,
          outputTokenDetails: { textTokens: 1, reasoningTokens: 1 },
          totalTokens: 1,
          raw: {},
        },
      },
      parts: [
        {
          type: "text",
          text: "Eine Beispielnachricht.",
          state: "streaming",
          providerMetadata: {},
        },
      ],
    },
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MessagePartsEmpty: Story = {
  args: { message: { ...meta.args["message"], parts: [] } },
};
export const MessagePartsMultiple: Story = {
  args: {
    message: {
      ...meta.args["message"],
      parts: repeatFixtures(meta.args["message"]["parts"]),
    },
  },
};
export const Opened: Story = { play: openDisclosure };
