import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorSettings } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorSettings";

const meta = {
  title: "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorSettings",
  component: TranscriberEditorSettings,
  args: {},
} satisfies Meta<typeof TranscriberEditorSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
