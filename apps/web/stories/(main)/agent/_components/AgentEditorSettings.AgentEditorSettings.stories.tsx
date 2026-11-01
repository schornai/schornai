import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorSettings } from "../../../../app/(main)/agent/_components/AgentEditorSettings";

const meta = {
  title: "Web/(main)/agent/AgentEditorSettings",
  component: AgentEditorSettings,
  args: {},
} satisfies Meta<typeof AgentEditorSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
