import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationIconGroupActions } from "../../../../app/(main)/app/automation/_components/AutomationIconGroupActions";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationIconGroupActions",
  component: AutomationIconGroupActions,
  args: { automation: savedAutomation },
} satisfies Meta<typeof AutomationIconGroupActions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
