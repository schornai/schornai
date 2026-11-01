import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ChatCancelGeneration } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatCancelGeneration";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatCancelGeneration",
  component: ChatCancelGeneration,
} satisfies Meta<typeof ChatCancelGeneration>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pending: Story = {
  parameters: { scenario: "pending" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button")).toBeDisabled();
  },
};
export const Idle: Story = {
  parameters: {
    contextFixtures: { useChatComposeMessage: { activity: { state: "idle" } } },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("button")).toBeNull();
  },
};
export const Error: Story = {
  parameters: { scenario: "error" },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    await expect(await canvas.findByRole("alert")).toBeVisible();
    await expect(canvas.getByRole("button")).toBeEnabled();
  },
};
