import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorRoleTools } from "../../../../app/(main)/agent/_components/AgentEditorRoleTools";

const meta = {
  title: "Web/(main)/agent/AgentEditorRoleTools",
  component: AgentEditorRoleTools,
  args: { roleId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof AgentEditorRoleTools>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
