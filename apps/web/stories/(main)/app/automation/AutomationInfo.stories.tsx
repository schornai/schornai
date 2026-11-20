import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationInfo } from "../../../../app/(main)/app/automation/_components/AutomationInfo";
import { savedAutomation, agents, repositories } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationInfo",
  component: AutomationInfo,
  args: {
    showXRAGActions: true,
    automation: savedAutomation,
    agents,
    repositories,
    editable: true,
  },
} satisfies Meta<typeof AutomationInfo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Storage: Story = {
  args: {
    automation: {
      ...savedAutomation,
      trigger: {
        type: "storage",
        storage: {
          type: "documentRepository",
          documentRepositoryId: "demo",
          workspaceId: "demo",
        },
        folder: "Eingang",
        includeSubfolders: true,
        attachment: "copy",
        events: ["processed"],
      },
    },
  },
};
export const Paused: Story = {
  args: { automation: { ...savedAutomation, enabled: false } },
};

export const Expanded: Story = {
  ...Storage,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Auslöser" }));
    await userEvent.click(canvas.getByRole("button", { name: "Agent" }));
    await userEvent.click(canvas.getByRole("button", { name: "Nachricht" }));
    await expect(canvas.getByText("Unterordner einschließen")).toBeVisible();
  },
};
export const Changed: Story = {
  args: {
    preview: true,
    showXRAGActions: false,
    editDefaultAutomation: savedAutomation,
    automation: {
      ...savedAutomation,
      message: "Neue Startnachricht",
      nextRunAt: undefined,
      trigger: { type: "time", schedule: { kind: "hours", every: 6 } },
    },
  },
};
