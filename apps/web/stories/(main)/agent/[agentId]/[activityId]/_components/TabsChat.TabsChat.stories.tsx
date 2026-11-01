import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsChat } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/TabsChat";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/TabsChat",
  component: TabsChat,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    agentId: "11111111-1111-4111-8111-111111111111",
    pathSegment: "chat",
  },
} satisfies Meta<typeof TabsChat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const PathSegment_chat: Story = { args: {} };
export const PathSegment_files: Story = { args: { pathSegment: "files" } };
export const PathSegment_info: Story = { args: { pathSegment: "info" } };
