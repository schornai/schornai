import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FeedbackContext } from "../../../app/feedback/_components/FeedbackContext";

const meta = {
  title: "Web/feedback/FeedbackContext",
  component: FeedbackContext,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof FeedbackContext>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
