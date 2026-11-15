import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationFavorite } from "../../../../app/(main)/app/automation/_components/AutomationFavorite";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationFavorite",
  component: AutomationFavorite,
  args: { automation: savedAutomation },
} satisfies Meta<typeof AutomationFavorite>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Saved: Story = {
  args: {
    favorites: {
      version: "favorites-v2",
      showInSidebar: true,
      favorites: [{ type: "automation", id: savedAutomation.id }],
    },
  },
};
