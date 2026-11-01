import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatToolApprovalContent } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApprovalContent";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatToolApprovalContent",
  component: ChatToolApprovalContent,
  args: {
    children: "Beispielinhalt",
    description: "Eine Beschreibung für Storybook.",
    icon: false,
    title: "Beispiel",
  },
} satisfies Meta<typeof ChatToolApprovalContent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
