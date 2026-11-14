import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationEditorOverview } from "../../../../app/(main)/app/automation/_components/AutomationEditorOverview";
import { automation, agents, repositories } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationEditorOverview",
  component: AutomationEditorOverview,
  args: { automation, agents, repositories, creating: true },
} satisfies Meta<typeof AutomationEditorOverview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
