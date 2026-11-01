import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatComposeMessageContext } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageContext";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatComposeMessageContext",
  component: ChatComposeMessageContext,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    agentId: "11111111-1111-4111-8111-111111111111",
    modelThinking: "mandatory-on",
    children: "Beispielinhalt",
  },
} satisfies Meta<typeof ChatComposeMessageContext>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ModelThinking_mandatory_on: Story = { args: {} };
export const ModelThinking_optional_on: Story = {
  args: { modelThinking: "optional-on" },
};
export const ModelThinking_mandatory_off: Story = {
  args: { modelThinking: "mandatory-off" },
};
export const ModelThinking_optional_off: Story = {
  args: { modelThinking: "optional-off" },
};
export const ModelThinking_missing: Story = {
  args: { modelThinking: undefined },
};
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
