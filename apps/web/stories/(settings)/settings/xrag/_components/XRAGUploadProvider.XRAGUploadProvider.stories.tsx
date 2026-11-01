import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import XRAGUploadProvider from "../../../../../app/(settings)/settings/xrag/_components/XRAGUploadProvider";

const meta = {
  title: "Web/(settings)/settings/xrag/XRAGUploadProvider",
  component: XRAGUploadProvider,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof XRAGUploadProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
