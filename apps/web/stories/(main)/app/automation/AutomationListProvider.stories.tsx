import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationListProvider } from "../../../../app/(main)/app/automation/_components/AutomationListProvider";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationListProvider",
  component: AutomationListProvider,
  args: { automations: [savedAutomation], userPreferences: {}, children: null },
  render: () => (
    <AutomationListProvider
      automations={[savedAutomation]}
      userPreferences={{}}
    >
      <div>Automationen</div>
    </AutomationListProvider>
  ),
} satisfies Meta<typeof AutomationListProvider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
