import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationDetailHeader } from "../../../../app/(main)/app/automation/_components/AutomationDetailHeader";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationDetailHeader",
  component: AutomationDetailHeader,
  args: { automation: savedAutomation, view: "info" },
} satisfies Meta<typeof AutomationDetailHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
