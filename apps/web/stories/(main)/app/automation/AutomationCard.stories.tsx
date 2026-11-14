import { userEvent, within, expect, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationCard } from "../../../../app/(main)/app/automation/_components/AutomationCard";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationCard",
  component: AutomationCard,
  args: { automation: savedAutomation },
} satisfies Meta<typeof AutomationCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Hover: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(
      within(canvasElement).getByRole("button", { name: "Zeitbasiert" }),
    );
    await waitFor(() => {
      const tooltip = canvasElement.ownerDocument.querySelector(
        '[data-slot="tooltip-content"]',
      );
      expect(tooltip).toBeVisible();
      expect(tooltip).toHaveTextContent(
        "Nächste Ausführung: 07.01.2030, 09:00",
      );
    });
  },
};
