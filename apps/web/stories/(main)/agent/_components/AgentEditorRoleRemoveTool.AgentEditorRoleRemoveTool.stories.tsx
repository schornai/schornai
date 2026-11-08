import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorRoleRemoveTool } from "../../../../app/(main)/agent/_components/AgentEditorRoleRemoveTool";
const meta = {
  title: "Web/(main)/agent/AgentEditorRoleRemoveTool",
  component: AgentEditorRoleRemoveTool,
  args: { roleId: "role", tool: "toolCalculator" },
} satisfies Meta<typeof AgentEditorRoleRemoveTool>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Confirmation: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /Werkzeug entfernen|Remove tool/ }),
    );
  },
};
