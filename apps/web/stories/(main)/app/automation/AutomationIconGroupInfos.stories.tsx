import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationIconGroupInfos } from "../../../../app/(main)/app/automation/_components/AutomationIconGroupInfos";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationIconGroupInfos",
  component: AutomationIconGroupInfos,
  args: { automation: savedAutomation },
} satisfies Meta<typeof AutomationIconGroupInfos>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
