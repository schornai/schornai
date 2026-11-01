import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatComposeMessageBatchItem } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageBatchItem";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatComposeMessageBatchItem",
  component: ChatComposeMessageBatchItem,
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      state: "queued",
      content: {
        type: "text",
        files: [
          {
            type: "text",
            name: "Beispiel",
            path: "/beispiel.txt",
            createdAtISO: "2026-01-15T12:00:00.000Z",
            file: true,
            readableContent: "text",
            size: 1,
            updatedAtISO: "2026-01-15T12:00:00.000Z",
            currentAction: {
              target: {
                name: "Beispiel",
                path: "/beispiel.txt",
                createdAtISO: "2026-01-15T12:00:00.000Z",
                file: true,
                readableContent: "text",
                size: 1,
                type: "text",
                updatedAtISO: "2026-01-15T12:00:00.000Z",
              },
              progress: 45,
              state: "uploading",
            },
          },
        ],
        text: "Eine Beispielnachricht.",
        thinking: false,
      },
    },
    position: 1,
  },
} satisfies Meta<typeof ChatComposeMessageBatchItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Message_state_queued: Story = { args: {} };
export const Message_state_submitted: Story = {
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      state: "submitted",
      content: {
        type: "text",
        files: [
          {
            type: "text",
            name: "Beispiel",
            path: "/beispiel.txt",
            createdAtISO: "2026-01-15T12:00:00.000Z",
            file: true,
            readableContent: "text",
            size: 1,
            updatedAtISO: "2026-01-15T12:00:00.000Z",
            currentAction: {
              target: {
                name: "Beispiel",
                path: "/beispiel.txt",
                createdAtISO: "2026-01-15T12:00:00.000Z",
                file: true,
                readableContent: "text",
                size: 1,
                type: "text",
                updatedAtISO: "2026-01-15T12:00:00.000Z",
              },
              progress: 45,
              state: "uploading",
            },
          },
        ],
        text: "Eine Beispielnachricht.",
        thinking: false,
      },
    },
  },
};
export const Message_state_claimed: Story = {
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      state: "claimed",
      content: {
        type: "text",
        files: [
          {
            type: "text",
            name: "Beispiel",
            path: "/beispiel.txt",
            createdAtISO: "2026-01-15T12:00:00.000Z",
            file: true,
            readableContent: "text",
            size: 1,
            updatedAtISO: "2026-01-15T12:00:00.000Z",
            currentAction: {
              target: {
                name: "Beispiel",
                path: "/beispiel.txt",
                createdAtISO: "2026-01-15T12:00:00.000Z",
                file: true,
                readableContent: "text",
                size: 1,
                type: "text",
                updatedAtISO: "2026-01-15T12:00:00.000Z",
              },
              progress: 45,
              state: "uploading",
            },
          },
        ],
        text: "Eine Beispielnachricht.",
        thinking: false,
      },
    },
  },
};
export const Message_state_finished: Story = {
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      state: "finished",
      content: {
        type: "text",
        files: [
          {
            type: "text",
            name: "Beispiel",
            path: "/beispiel.txt",
            createdAtISO: "2026-01-15T12:00:00.000Z",
            file: true,
            readableContent: "text",
            size: 1,
            updatedAtISO: "2026-01-15T12:00:00.000Z",
            currentAction: {
              target: {
                name: "Beispiel",
                path: "/beispiel.txt",
                createdAtISO: "2026-01-15T12:00:00.000Z",
                file: true,
                readableContent: "text",
                size: 1,
                type: "text",
                updatedAtISO: "2026-01-15T12:00:00.000Z",
              },
              progress: 45,
              state: "uploading",
            },
          },
        ],
        text: "Eine Beispielnachricht.",
        thinking: false,
      },
    },
  },
};
export const Message_state_paused: Story = {
  args: {
    message: {
      id: "11111111-1111-4111-8111-111111111111",
      state: "paused",
      content: {
        type: "text",
        files: [
          {
            type: "text",
            name: "Beispiel",
            path: "/beispiel.txt",
            createdAtISO: "2026-01-15T12:00:00.000Z",
            file: true,
            readableContent: "text",
            size: 1,
            updatedAtISO: "2026-01-15T12:00:00.000Z",
            currentAction: {
              target: {
                name: "Beispiel",
                path: "/beispiel.txt",
                createdAtISO: "2026-01-15T12:00:00.000Z",
                file: true,
                readableContent: "text",
                size: 1,
                type: "text",
                updatedAtISO: "2026-01-15T12:00:00.000Z",
              },
              progress: 45,
              state: "uploading",
            },
          },
        ],
        text: "Eine Beispielnachricht.",
        thinking: false,
      },
    },
  },
};
export const Message_content_text_text: Story = { args: {} };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MessageContentFilesEmpty: Story = {
  args: {
    message: {
      ...meta.args["message"],
      content: { ...meta.args["message"]["content"], files: [] },
    },
  },
};
export const MessageContentFilesMultiple: Story = {
  args: {
    message: {
      ...meta.args["message"],
      content: {
        ...meta.args["message"]["content"],
        files: repeatFixtures(meta.args["message"]["content"]["files"]),
      },
    },
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
