import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsTranscription } from "../../../../../../../app/(main)/app/transcribe/[transcriberId]/[activityId]/_components/TabsTranscription";

const meta = {
  tags: ["async-component"],
  title:
    "Web/(main)/app/transcribe/[transcriberId]/[activityId]/TabsTranscription",
  component: TabsTranscription,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    transcriberId: "11111111-1111-4111-8111-111111111111",
    pathSegment: "files",
  },
} satisfies Meta<typeof TabsTranscription>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const PathSegment_files: Story = { args: {} };
export const PathSegment_info: Story = { args: { pathSegment: "info" } };

export const Empty: Story = { parameters: { scenario: "empty" } };
