import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorPrompt } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorPrompt";

const meta = {
  title: "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorPrompt",
  component: TranscriberEditorPrompt,
  args: {},
} satisfies Meta<typeof TranscriberEditorPrompt>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
