import { openMenu } from "../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageFilePreviewTranscription } from "../../../app/_components/transcription/StorageFilePreviewTranscription";

const meta = {
  title: "Web/transcription/StorageFilePreviewTranscription",
  component: StorageFilePreviewTranscription,
  args: {
    fileContent: {
      type: "transcript",
      segments: [
        {
          noSpeechProbability: 1,
          timeEnd: 12,
          timeStart: 0,
          words: [
            {
              probability: 1,
              timeEnd: 12,
              timeStart: 0,
              word: "Willkommen zur Projektbesprechung. Wir besprechen heute die nächsten Schritte und offenen Fragen.",
            },
          ],
          reviewed: false,
        },
      ],
    },
    fileObject: {
      type: "audio",
      name: "Projektbesprechung.mp3",
      path: "/projektbesprechung.mp3",
      createdAtISO: "2026-01-15T12:00:00.000Z",
      file: true,
      readableContent: "transcript",
      size: 1,
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
    storage: {
      type: "activity",
      activityId: "11111111-1111-4111-8111-111111111111",
      agentId: "11111111-1111-4111-8111-111111111111",
    },
  },
} satisfies Meta<typeof StorageFilePreviewTranscription>;
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
export const FileContentSegmentsEmpty: Story = {
  args: { fileContent: { ...meta.args["fileContent"], segments: [] } },
};
export const FileContentSegmentsMultiple: Story = {
  args: {
    fileContent: {
      ...meta.args["fileContent"],
      segments: repeatFixtures(meta.args["fileContent"]["segments"]),
    },
  },
};
export const MenuOpened: Story = { play: openMenu };
