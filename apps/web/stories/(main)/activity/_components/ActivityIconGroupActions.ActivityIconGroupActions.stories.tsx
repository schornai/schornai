import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityIconGroupActions } from "../../../../app/(main)/activity/_components/ActivityIconGroupActions";

const meta = {
  title: "Web/(main)/activity/ActivityIconGroupActions",
  component: ActivityIconGroupActions,
  args: {
    activity: {
      content: {
        type: "chat",
        chatbotId: "11111111-1111-4111-8111-111111111111",
      },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: false,
      pinned: false,
      state: "running",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
} satisfies Meta<typeof ActivityIconGroupActions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Activity_content_chat_chat: Story = { args: {} };
export const Activity_content_reindex_reindex: Story = {
  args: {
    activity: {
      content: { type: "reindex" },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: false,
      pinned: false,
      state: "running",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
};
export const Activity_content_transcription_transcription: Story = {
  args: {
    activity: {
      content: {
        type: "transcription",
        transcriberId: "11111111-1111-4111-8111-111111111111",
      },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: false,
      pinned: false,
      state: "running",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
};
export const Activity_labelUserInput_false: Story = { args: {} };
export const Activity_labelUserInput_true: Story = {
  args: {
    activity: {
      content: {
        type: "chat",
        chatbotId: "11111111-1111-4111-8111-111111111111",
      },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: true,
      pinned: false,
      state: "running",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
};
export const Activity_pinned_false: Story = { args: {} };
export const Activity_pinned_true: Story = {
  args: {
    activity: {
      content: {
        type: "chat",
        chatbotId: "11111111-1111-4111-8111-111111111111",
      },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: false,
      pinned: true,
      state: "running",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
};
export const Activity_state_running: Story = { args: {} };
export const Activity_state_success: Story = {
  args: {
    activity: {
      content: {
        type: "chat",
        chatbotId: "11111111-1111-4111-8111-111111111111",
      },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: false,
      pinned: false,
      state: "success",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
};
export const Activity_state_error: Story = {
  args: {
    activity: {
      content: {
        type: "chat",
        chatbotId: "11111111-1111-4111-8111-111111111111",
      },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: false,
      pinned: false,
      state: "error",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
};
export const Activity_state_idle: Story = {
  args: {
    activity: {
      content: {
        type: "chat",
        chatbotId: "11111111-1111-4111-8111-111111111111",
      },
      createdAtISO: "2026-01-15T12:00:00.000Z",
      deleteAtISO: "Beispiel",
      id: "11111111-1111-4111-8111-111111111111",
      label: "Beispiel",
      labelUserInput: false,
      pinned: false,
      state: "idle",
      stateTimeoutISO: "2026-01-15T12:00:00.000Z",
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
