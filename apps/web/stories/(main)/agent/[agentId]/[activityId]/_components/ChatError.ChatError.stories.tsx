import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ChatError } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatError";

const meta = {
  title: "Web/Agent/ChatError",
  component: ChatError,
  args: {
    agentId: "agent",
    activityId: "11111111-1111-4111-8111-111111111111",
    error:
      "Das Sprachmodell ist nicht erreichbar.\nDie Verbindung wurde unterbrochen (HTTP 503).",
  },
} satisfies Meta<typeof ChatError>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {
      name: /Fehlerdetails|Error details/,
    });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.getByText(/Die Verbindung wurde unterbrochen/),
    ).toBeVisible();
  },
};
export const NoDetails: Story = { args: { error: "" } };
export const LongError: Story = {
  args: { error: "Model request failed: ".repeat(40) },
};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const RetryFailed: Story = { parameters: { scenario: "error" } };
export const Retry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retry = canvas.getByRole("button", {
      name: /Erneut versuchen|Retry/,
    });
    await userEvent.click(retry);
    await expect(retry).toBeDisabled();
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};
