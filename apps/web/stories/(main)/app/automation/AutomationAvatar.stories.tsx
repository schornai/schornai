import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationAvatar } from "../../../../app/(main)/app/automation/_components/AutomationAvatar";
const meta = {
  title: "Web/(main)/app/automation/AutomationAvatar",
  component: AutomationAvatar,
} satisfies Meta<typeof AutomationAvatar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Custom: Story = {
  args: { icon: { type: "icon-lucide", iconName: "calendar-clock" } },
};
