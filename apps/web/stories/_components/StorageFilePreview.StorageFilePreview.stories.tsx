import { repeatFixtures } from "../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageFilePreview } from "../../app/_components/StorageFilePreview";

const meta = {
  title: "Web/StorageFilePreview",
  component: StorageFilePreview,
  args: {
    fileContent: {
      type: "mdc",
      current: "Beispiel",
      versions: [
        {
          changes: [{ action: "add", change: "Beispiel", row: 1 }],
          date: new Date("2026-01-15T12:00:00.000Z"),
          version: 1,
        },
      ],
    },
    fileObject: {
      type: "text",
      name: "Beispiel",
      path: "/beispiel.txt",
      createdAtISO: "2026-01-15T12:00:00.000Z",
      file: true,
      readableContent: "text",
      size: 1,
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
    storage: {
      type: "activity",
      activityId: "11111111-1111-4111-8111-111111111111",
      agentId: "11111111-1111-4111-8111-111111111111",
    },
  },
} satisfies Meta<typeof StorageFilePreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FileContent_mdc_mdc: Story = { args: {} };
export const FileContent_transcript_transcript: Story = {
  args: {
    fileContent: {
      type: "transcript",
      segments: [
        {
          noSpeechProbability: 1,
          timeEnd: 1,
          timeStart: 1,
          words: [
            {
              probability: 1,
              timeEnd: 1,
              timeStart: 1,
              word: "Beispiel",
              wordOverride: "11111111-1111-4111-8111-111111111111",
            },
          ],
          reviewed: false,
          segmentOverride: "11111111-1111-4111-8111-111111111111",
        },
      ],
    },
  },
};
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
export const FileContentVersionsEmpty: Story = {
  args: { fileContent: { ...meta.args["fileContent"], versions: [] } },
};
export const FileContentVersionsMultiple: Story = {
  args: {
    fileContent: {
      ...meta.args["fileContent"],
      versions: repeatFixtures(meta.args["fileContent"]["versions"]),
    },
  },
};
