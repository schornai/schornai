import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { StorageDialogCreateFolder } from "../../app/_components/StorageDialogCreateFolder";

const meta = {
  title: "Web/StorageDialogCreateFolder",
  component: StorageDialogCreateFolder,
  args: {
    basePath: "/",
    onOpenChange: fn(),
    open: false,
    storage: {
      type: "activity",
      activityId: "11111111-1111-4111-8111-111111111111",
      agentId: "11111111-1111-4111-8111-111111111111",
    },
  },
} satisfies Meta<typeof StorageDialogCreateFolder>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open_false: Story = { args: {} };
export const Open_true: Story = { args: { open: true } };
export const Storage_activity_activity: Story = { args: {} };
export const Storage_activity_transcription_activity_transcription: Story = {
  args: {
    storage: {
      type: "activity-transcription",
      activityId: "11111111-1111-4111-8111-111111111111",
      transcriberId: "11111111-1111-4111-8111-111111111111",
    },
  },
};
export const Storage_documentRepository_documentRepository: Story = {
  args: {
    storage: {
      type: "documentRepository",
      documentRepositoryId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "11111111-1111-4111-8111-111111111111",
    },
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
