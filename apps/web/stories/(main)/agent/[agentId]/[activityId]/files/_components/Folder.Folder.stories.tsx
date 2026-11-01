import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Folder } from "../../../../../../../app/(main)/agent/[agentId]/[activityId]/files/_components/Folder";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/agent/[agentId]/[activityId]/files/Folder",
  component: Folder,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    agentId: "11111111-1111-4111-8111-111111111111",
    path: "/beispiel.txt",
  },
} satisfies Meta<typeof Folder>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
