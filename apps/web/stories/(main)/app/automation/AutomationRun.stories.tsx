import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { AutomationRun } from "../../../../app/(main)/app/automation/_components/AutomationRun";
import { automation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationRun",
  component: AutomationRun,
  args: { automation: { id: automation.id!, trigger: automation.trigger } },
} satisfies Meta<typeof AutomationRun>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const File: Story = {
  args: {
    automation: {
      id: automation.id!,
      trigger: {
        type: "storage",
        storage: {
          type: "documentRepository",
          documentRepositoryId: "demo",
          workspaceId: "demo",
        },
        events: ["processed"],
        folder: "",
        includeSubfolders: true,
        attachment: "copy",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Jetzt ausführen" }),
    );
    await expect(within(document.body).getByRole("dialog")).toBeVisible();
  },
};

export const Compact: Story = { args: { compact: true } };
export const CompactPending: Story = {
  args: { compact: true },
  parameters: { scenario: "pending" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", {
      name: "Jetzt ausführen",
    });
    await expect(button).toBeDisabled();
    await expect(button.querySelectorAll("svg")).toHaveLength(1);
    await expect(button.querySelector(".lucide-loader-circle")).not.toBeNull();
    await expect(button.querySelector(".lucide-play")).toBeNull();
  },
};
export const CompactError: Story = {
  args: { compact: true },
  parameters: { scenario: "error" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", {
      name: "Jetzt ausführen",
    });
    await expect(button.querySelectorAll("svg")).toHaveLength(1);
    await expect(button.querySelector(".lucide-play")).toBeNull();
  },
};
