import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorSettingsWorkspace } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorSettingsWorkspace";

const meta = {
  title:
    "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorSettingsWorkspace",
  component: TranscriberEditorSettingsWorkspace,
  args: {},
} satisfies Meta<typeof TranscriberEditorSettingsWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
