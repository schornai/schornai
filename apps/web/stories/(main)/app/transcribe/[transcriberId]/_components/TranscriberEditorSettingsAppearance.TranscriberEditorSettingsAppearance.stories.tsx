import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorSettingsAppearance } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorSettingsAppearance";

const meta = {
  title:
    "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorSettingsAppearance",
  component: TranscriberEditorSettingsAppearance,
  args: {},
} satisfies Meta<typeof TranscriberEditorSettingsAppearance>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
