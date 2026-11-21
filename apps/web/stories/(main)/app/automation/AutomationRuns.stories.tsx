import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { AutomationRuns } from "../../../../app/(main)/app/automation/_components/AutomationRuns";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationRuns",
  component: AutomationRuns,
  args: {
    automation: savedAutomation,
    runs: [
      {
        id: "run-1",
        activity_id: "chat-1",
        state: "queued",
        event: {},
        error_code: null,
        created_at: "2026-11-14T09:30:00Z",
        finished_at: "2026-11-14T09:30:02Z",
      },
      {
        id: "run-2",
        activity_id: "chat-2",
        state: "failed",
        event: {},
        error_code: "failed",
        created_at: "2026-11-13T08:00:00Z",
        finished_at: "2026-11-13T08:00:03Z",
      },
      {
        id: "run-3",
        activity_id: "chat-3",
        state: "pending",
        event: {},
        error_code: null,
        created_at: "2026-11-14T10:00:00Z",
        finished_at: null,
      },
    ],
  },
} satisfies Meta<typeof AutomationRuns>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("table")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Chat öffnen" }),
    ).toHaveAttribute("href", `/agent/${savedAutomation.agentId}/chat-1`);
    await expect(
      canvasElement.querySelector("tbody time"),
    ).not.toHaveTextContent("2026-11-14T");
  },
};
export const Empty: Story = { args: { runs: [] } };
export const Grouped: Story = { args: { userPreferences: { group: "state" } } };
export const OldestFirst: Story = {
  args: { userPreferences: { sort: "created:asc" } },
};
export const NoResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox"), "zzzzzzzzzzzz");
    await expect(
      await canvas.findByText("Keine passenden Ausführungen"),
    ).toBeVisible();
  },
};
