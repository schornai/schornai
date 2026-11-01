import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { File } from "../../../../../../../../app/(main)/app/transcribe/[transcriberId]/[activityId]/files/_components/File";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/app/transcribe/[transcriberId]/[activityId]/files/File",
  component: File,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
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
    transcriberId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof File>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
