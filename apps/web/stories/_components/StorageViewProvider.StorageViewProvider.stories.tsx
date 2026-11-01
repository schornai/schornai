import { repeatFixtures } from "../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageViewProvider } from "../../app/_components/StorageViewProvider";

const meta = {
  title: "Web/StorageViewProvider",
  component: StorageViewProvider,
  args: {
    basePathApp: "/files",
    basePathStorage: "/",
    children: "Beispielinhalt",
    id: "11111111-1111-4111-8111-111111111111",
    storage: {
      type: "activity",
      activityId: "11111111-1111-4111-8111-111111111111",
      agentId: "11111111-1111-4111-8111-111111111111",
    },
    storageObjects: [
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
    userPreferences: { group: "no-group", sort: "name:asc", view: "table" },
  },
} satisfies Meta<typeof StorageViewProvider>;
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
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const StorageObjectsEmpty: Story = { args: { storageObjects: [] } };
export const StorageObjectsMultiple: Story = {
  args: { storageObjects: repeatFixtures(meta.args["storageObjects"]) },
};
