import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorSettingsModel } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorSettingsModel";

const meta = {
  title:
    "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorSettingsModel",
  component: TranscriberEditorSettingsModel,
  args: {},
} satisfies Meta<typeof TranscriberEditorSettingsModel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
