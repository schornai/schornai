import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorOverview } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorOverview";

const meta = {
  title: "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorOverview",
  component: TranscriberEditorOverview,
  args: {
    mode: "create",
  },
} satisfies Meta<typeof TranscriberEditorOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mode_create: Story = { args: {} };
export const Mode_update: Story = { args: { mode: "update" } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
