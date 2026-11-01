import { openDialog } from "../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Actions } from "../../../app/feedback/_components/Actions";

const meta = {
  title: "Web/feedback/Actions",
  component: Actions,
  args: {},
} satisfies Meta<typeof Actions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const DialogOpened: Story = { play: openDialog };
