import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatToolApproval } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApproval";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatToolApproval",
  component: ChatToolApproval,
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    request: {
      approvalId: "11111111-1111-4111-8111-111111111111",
      toolName: "Beispiel",
      input: {},
    },
  },
} satisfies Meta<typeof ChatToolApproval>;
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
export const ChatIdle: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "idle", useCanSendMessage: true },
  },
};
export const ChatQueued: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "queued", useCanSendMessage: false },
  },
};
export const ChatGenerating: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "generating", useCanSendMessage: false },
  },
};
export const ChatError: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "error", useCanSendMessage: true },
  },
};
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
export const StorageWrite: Story = {
  args: {
    request: {
      approvalId: "approval-1",
      toolName: "storage-write-file",
      input: { path: "/example.md", content: "# Beispiel" },
    },
  },
};
export const Unavailable: Story = {
  parameters: { contextFixtures: { useCanSendMessage: false } },
};

export const WebFetchChat: Story = {
  args: {
    request: {
      approvalId: "fetch-chat",
      toolName: "web-fetch",
      input: { url: "https://example.com/report.pdf" },
    },
  },
};
export const WebFetchRepository: Story = {
  args: {
    request: {
      approvalId: "fetch-repo",
      toolName: "web-fetch",
      input: {
        url: "https://example.com/report.pdf",
        path: "docs/research/report.pdf",
      },
    },
  },
};

export const MCPConnection: Story = {
  args: {
    request: {
      approvalId: "approval",
      toolName: "mcp",
      input: { serverId: "trello" },
    },
  },
  parameters: { contextFixtures: { useCanSendMessage: true } },
};
