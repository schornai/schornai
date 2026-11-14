import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationListProvider } from "../../../../app/(main)/app/automation/_components/AutomationListProvider";
import { AutomationListOptionsDropdown } from "../../../../app/(main)/app/automation/_components/AutomationListOptionsDropdown";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationListOptionsDropdown",
  component: AutomationListOptionsDropdown,
  render: () => (
    <AutomationListProvider
      automations={[savedAutomation]}
      userPreferences={{}}
    >
      <AutomationListOptionsDropdown />
    </AutomationListProvider>
  ),
} satisfies Meta<typeof AutomationListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Optionen" }),
    );
    await expect(await within(document.body).findByRole("menu")).toBeVisible();
  },
};
