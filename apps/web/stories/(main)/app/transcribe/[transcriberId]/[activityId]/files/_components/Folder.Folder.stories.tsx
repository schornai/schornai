import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Folder } from "../../../../../../../../app/(main)/app/transcribe/[transcriberId]/[activityId]/files/_components/Folder";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/app/transcribe/[transcriberId]/[activityId]/files/Folder",
  component: Folder,
  parameters: {
    contextFixtures: {
      useStorageView: {
        storage: {
          type: "activity-transcription",
          activityId: "11111111-1111-4111-8111-111111111111",
          transcriberId: "11111111-1111-4111-8111-111111111111",
        },
      },
    },
  },
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    transcriberId: "11111111-1111-4111-8111-111111111111",
    path: "/beispiel.txt",
  },
} satisfies Meta<typeof Folder>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
