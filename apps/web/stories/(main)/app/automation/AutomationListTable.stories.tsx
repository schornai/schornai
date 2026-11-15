import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationListProvider } from "../../../../app/(main)/app/automation/_components/AutomationListProvider";
import { AutomationListTable } from "../../../../app/(main)/app/automation/_components/AutomationListTable";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationListTable",
  component: AutomationListTable,
  render: () => (
    <AutomationListProvider
      automations={[savedAutomation]}
      userPreferences={{}}
    >
      <AutomationListTable />
    </AutomationListProvider>
  ),
} satisfies Meta<typeof AutomationListTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
