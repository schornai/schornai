import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatComposeMessage } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessage";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatComposeMessage",
  component: ChatComposeMessage,
  args: { agentColor: { type: "color-oklch-hue", oklchHue: 284 } },
} satisfies Meta<typeof ChatComposeMessage>;
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
export const AgentColor_missing: Story = { args: { agentColor: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MessageQueued: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "queued",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "queued",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessagePaused: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "paused",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "paused",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessageSubmitted: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "submitted",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "submitted",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessageClaimed: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "claimed",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "claimed",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessageFinished: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "finished",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "finished",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const NoSelectedMessage: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: undefined,
        messageBatch: [],
      },
    },
  },
};
export const Thinking: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        defaultThinking: true,
        selectedCurrentMessage: {
          id: "message-1",
          state: "queued",
          content: { type: "text", text: "Beispielnachricht", thinking: true },
        },
      },
    },
  },
};
export const SubmittedApproval: Story = {
  parameters: {
    contextFixtures: { useChatComposeMessage: { approvalSubmitted: true } },
  },
};
export const RetryApproval: Story = {
  parameters: {
    scenario: "error",
    contextFixtures: { useChatComposeMessage: { approvalSubmitted: true } },
  },
};
export const ToolApproval: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        interaction: {
          type: "tool-approval",
          request: {
            approvalId: "approval-1",
            toolName: "storage-write-file",
            input: { path: "/example.md", content: "# Beispiel\n\nInhalt." },
          },
        },
      },
    },
  },
};
