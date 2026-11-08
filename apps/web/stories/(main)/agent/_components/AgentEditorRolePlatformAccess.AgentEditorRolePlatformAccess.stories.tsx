import { defaultPlatformAgentAccess } from "@schornio/aibox-package-database/mcp/platformAgentPolicy";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen } from "storybook/test";
import { useEffect, useState } from "react";
import { AgentEditorRolePlatformAccess } from "../../../../app/(main)/agent/_components/AgentEditorRolePlatformAccess";
import { useAgentEditor } from "../../../../app/(main)/agent/_components/AgentEditor";
const role = {
  id: "platform-role",
  prompt: "",
  documentRepositoryMounts: [],
  toolPlatformAccess: defaultPlatformAgentAccess,
};
const meta = {
  title: "Web/(main)/agent/AgentEditorRolePlatformAccess",
  component: AgentEditorRolePlatformAccess,
  args: { role },
  render: function Interactive(args) {
    const [currentRole, setCurrentRole] = useState(args.role);
    useEffect(() => setCurrentRole(args.role), [args.role]);
    mocked(useAgentEditor).mockReturnValue({
      setAgentRole: (_id, update) => {
        if (update) setCurrentRole(update);
      },
    } as ReturnType<typeof useAgentEditor>);
    return <AgentEditorRolePlatformAccess {...args} role={currentRole} />;
  },
} satisfies Meta<typeof AgentEditorRolePlatformAccess>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Admin: Story = {
  args: {
    role: { ...role, toolPlatformAccess: { active: true, level: "admin" } },
  },
};
export const UserAccess: Story = {
  args: {
    role: { ...role, toolPlatformAccess: { active: true, level: "user" } },
  },
};
export const ChangeLevel: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("combobox")[3]!);
    await userEvent.click(
      await screen.findByRole("option", { name: /Freigabe erforderlich/ }),
    );
    await expect(canvas.getAllByRole("combobox")[3]!).toHaveTextContent(
      "Freigabe erforderlich",
    );
  },
};
