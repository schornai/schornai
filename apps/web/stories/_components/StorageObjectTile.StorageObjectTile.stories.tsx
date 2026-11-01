import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageObjectTile } from "../../app/_components/StorageObjectTile";

const meta = {
  title: "Web/StorageObjectTile",
  component: StorageObjectTile,
  args: {
    basePathApp: "/files",
    storage: {
      type: "activity",
      activityId: "11111111-1111-4111-8111-111111111111",
      agentId: "11111111-1111-4111-8111-111111111111",
    },
    storageObject: {
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
    variant: "Beispiel",
  },
} satisfies Meta<typeof StorageObjectTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
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
export const BasePathApp_missing: Story = { args: { basePathApp: undefined } };
export const Storage_missing: Story = { args: { storage: undefined } };
