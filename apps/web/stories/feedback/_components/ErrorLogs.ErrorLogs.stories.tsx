import { openDialog } from "../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ErrorLogs } from "../../../app/feedback/_components/ErrorLogs";

const meta = {
  title: "Web/feedback/ErrorLogs",
  component: ErrorLogs,
  args: {},
} satisfies Meta<typeof ErrorLogs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const Populated: Story = { parameters: { errorLogs: "selected" } };
export const Deselected: Story = { parameters: { errorLogs: "deselected" } };
export const MixedSelection: Story = { parameters: { errorLogs: "mixed" } };
export const DeleteConfirmation: Story = {
  parameters: Populated.parameters,
  play: openDialog,
};
