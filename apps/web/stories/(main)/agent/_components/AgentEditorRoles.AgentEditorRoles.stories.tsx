import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorRoles } from "../../../../app/(main)/agent/_components/AgentEditorRoles";

const meta = {
  title: "Web/(main)/agent/AgentEditorRoles",
  component: AgentEditorRoles,
  args: {},
} satisfies Meta<typeof AgentEditorRoles>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
