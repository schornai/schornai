import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorSettingsAppearance } from "../../../../app/(main)/agent/_components/AgentEditorSettingsAppearance";

const meta = {
  title: "Web/(main)/agent/AgentEditorSettingsAppearance",
  component: AgentEditorSettingsAppearance,
  args: {},
} satisfies Meta<typeof AgentEditorSettingsAppearance>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
