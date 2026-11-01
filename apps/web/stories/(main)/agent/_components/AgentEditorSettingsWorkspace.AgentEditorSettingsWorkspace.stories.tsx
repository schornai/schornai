import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorSettingsWorkspace } from "../../../../app/(main)/agent/_components/AgentEditorSettingsWorkspace";

const meta = {
  title: "Web/(main)/agent/AgentEditorSettingsWorkspace",
  component: AgentEditorSettingsWorkspace,
  args: {},
} satisfies Meta<typeof AgentEditorSettingsWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
