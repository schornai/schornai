import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationNextRun } from "../../../../app/(main)/app/automation/_components/AutomationNextRun";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationNextRun",
  component: AutomationNextRun,
  args: { automation: savedAutomation, showLabel: true },
} satisfies Meta<typeof AutomationNextRun>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Paused: Story = {
  args: { automation: { ...savedAutomation, enabled: false } },
};
export const Storage: Story = {
  args: {
    automation: {
      ...savedAutomation,
      trigger: {
        type: "storage",
        storage: { type: "documentRepository", documentRepositoryId: "demo" },
        events: ["processed"],
        folder: "",
        includeSubfolders: true,
        attachment: "copy",
      },
    },
  },
};
