import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatToolApprovalWebFetch } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApprovalWebFetch";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatToolApprovalWebFetch",
  component: ChatToolApprovalWebFetch,
  args: { input: { url: "https://example.com/report.pdf" } },
} satisfies Meta<typeof ChatToolApprovalWebFetch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Repository: Story = {
  args: {
    input: {
      url: "https://example.com/report.pdf",
      path: "docs/research/report.pdf",
    },
  },
};
export const MissingInput: Story = { args: { input: undefined } };
export const InvalidInput: Story = { args: { input: { url: 42 } } };
