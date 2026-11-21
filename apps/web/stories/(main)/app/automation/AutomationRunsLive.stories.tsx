import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";
import { AutomationRunsLive } from "../../../../app/(main)/app/automation/_components/AutomationRunsLive";
import { getAutomationRunsUpdates } from "@schornio/aibox-realtime/documents/automationRuns/_schema";
import { useHocuspocusProvider } from "../../../../.storybook/mocks/hocuspocus";
import { savedAutomation } from "./fixtures";

const meta = {
  title: "Web/(main)/app/automation/AutomationRunsLive",
  component: AutomationRunsLive,
  args: { automation: savedAutomation, runs: [] },
} satisfies Meta<typeof AutomationRunsLive>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Updated: Story = {
  play: async ({ canvasElement }) => {
    const state = getAutomationRunsUpdates(useHocuspocusProvider().document);
    state.set("revision", "started");
    state.set("revision", "queued");
    await waitFor(() =>
      expect(
        within(canvasElement).queryByText(/Live-Verbindung wird hergestellt/),
      ).toBeNull(),
    );
  },
};
