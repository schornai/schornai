import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessage } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessage";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessage",
  component: ChatMessage,
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
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
          state: "streaming",
          type: "text",
          text: "Eine Beispielnachricht.",
          providerMetadata: {},
        },
      ],
    },
  },
} satisfies Meta<typeof ChatMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AgentColor_color_oklch_hue_color_oklch_hue: Story = { args: {} };
export const AgentColor_color_rgb_color_rgb: Story = {
  args: {
    agentColor: {
      type: "color-rgb",
      blue: 200,
      green: 80,
      red: 100,
      opacity: 0.6,
    },
  },
};
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
          state: "streaming",
          type: "text",
          text: "Eine Beispielnachricht.",
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
          state: "streaming",
          type: "text",
          text: "Eine Beispielnachricht.",
          providerMetadata: {},
        },
      ],
    },
  },
};
export const AgentColor_missing: Story = { args: { agentColor: undefined } };
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

export const MCP: Story = {
  args: {
    message: {
      id: "mcp",
      role: "assistant",
      parts: [
        {
          type: "tool-mcp",
          toolCallId: "mcp",
          state: "output-available",
          input: { serverId: "service", toolName: "list_tasks" },
          output: { content: [] },
        },
        { type: "reasoning", state: "done", text: "Aufgaben wurden geprüft." },
      ],
    },
  },
};
