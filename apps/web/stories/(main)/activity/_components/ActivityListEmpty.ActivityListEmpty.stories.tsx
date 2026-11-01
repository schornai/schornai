import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityListEmpty } from "../../../../app/(main)/activity/_components/ActivityListEmpty";

const meta = {
  title: "Web/(main)/activity/ActivityListEmpty",
  component: ActivityListEmpty,
  args: {},
} satisfies Meta<typeof ActivityListEmpty>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
