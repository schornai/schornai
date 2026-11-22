import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Power } from "lucide-react";
import {
  AutomationInfoChat,
  AutomationInfoTrigger,
  AutomationInfoSection,
} from "../../../../app/(main)/app/automation/_components/AutomationInfoDetails";
import { agents, savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationInfoDetails",
  component: AutomationInfoTrigger,
  args: { automation: savedAutomation },
} satisfies Meta<typeof AutomationInfoTrigger>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Trigger: Story = {};
export const Chat: Story = {
  render: ({ automation }) => (
    <AutomationInfoChat
      automation={automation}
      agents={agents}
      editHref="?view=chat"
    />
  ),
};
export const Status: Story = {
  render: () => (
    <AutomationInfoSection icon={Power} title="Aktiv" editPath="?view=default">
      <p>Die Automation ist aktiviert.</p>
    </AutomationInfoSection>
  ),
};
