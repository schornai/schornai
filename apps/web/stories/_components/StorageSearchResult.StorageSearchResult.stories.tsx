import { repeatFixtures } from "../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import StorageSearchResult from "../../app/_components/StorageSearchResult";

const meta = {
  title: "Web/StorageSearchResult",
  component: StorageSearchResult,
  args: {
    basePathApp: "/files",
    results: [
      {
        digest: "Beispiel",
        digestOffset: 1,
        embeddingDistance: 1,
        file: {
          type: "text",
          name: "Beispiel",
          path: "/beispiel.txt",
          createdAtISO: "2026-01-15T12:00:00.000Z",
          file: true,
          readableContent: "text",
          size: 1,
          updatedAtISO: "2026-01-15T12:00:00.000Z",
        },
      },
    ],
    storage: {
      type: "activity",
      activityId: "11111111-1111-4111-8111-111111111111",
      agentId: "11111111-1111-4111-8111-111111111111",
    },
  },
} satisfies Meta<typeof StorageSearchResult>;
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
export const ResultsEmpty: Story = { args: { results: [] } };
export const ResultsMultiple: Story = {
  args: { results: repeatFixtures(meta.args["results"]) },
};
