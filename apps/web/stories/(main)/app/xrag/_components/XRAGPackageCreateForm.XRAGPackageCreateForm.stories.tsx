import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGPackageCreateForm } from "../../../../../app/(main)/app/xrag/_components/XRAGPackageCreateForm";

const meta = {
  title: "Web/(main)/app/xrag/XRAGPackageCreateForm",
  component: XRAGPackageCreateForm,
} satisfies Meta<typeof XRAGPackageCreateForm>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Error: Story = { parameters: { scenario: "error" } };
