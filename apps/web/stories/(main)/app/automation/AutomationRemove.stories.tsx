import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { AutomationRemove } from "../../../../app/(main)/app/automation/_components/AutomationRemove";
const meta = {
  title: "Web/(main)/app/automation/AutomationRemove",
  component: AutomationRemove,
  args: { id: "aac00000-0000-4000-8000-000000000001" },
} satisfies Meta<typeof AutomationRemove>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Confirm: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(
      within(canvasElement.ownerDocument.body).getByRole("alertdialog"),
    ).toBeVisible();
  },
};
export const Error: Story = { ...Confirm, parameters: { scenario: "error" } };
