import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import XRAGUpload from "../../../../../app/(settings)/settings/xrag/_components/XRAGUpload";

const meta = {
  title: "Web/(settings)/settings/xrag/XRAGUpload",
  component: XRAGUpload,
  args: {},
} satisfies Meta<typeof XRAGUpload>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
