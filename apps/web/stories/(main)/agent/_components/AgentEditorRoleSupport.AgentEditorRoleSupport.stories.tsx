import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mocked, expect } from "storybook/test";
import { useState } from "react";
import { AgentEditorRoleSupport } from "../../../../app/(main)/agent/_components/AgentEditorRoleSupport";
import { useAgentEditor } from "../../../../app/(main)/agent/_components/AgentEditor";
const role = {
  id: "support",
  prompt: "",
  documentRepositoryMounts: [],
  toolCalculator: { active: true },
  toolChatAwareness: {
    active: true,
    updateChatLabel: true,
    recommendNextMessages: true,
    currentDateTime: true,
  },
};
const meta = {
  title: "Web/(main)/agent/AgentEditorRoleSupport",
  component: AgentEditorRoleSupport,
  args: { role, kind: "toolChatAwareness" },
  render: function Interactive(args) {
    const [current, setCurrent] = useState(args.role);
    mocked(useAgentEditor).mockReturnValue({
      defaultAgent: { roles: [role] },
      hasValidationError: () => false,
      setAgent: () => {},
      relations: {
        connections: [],
        documentRepositories: [],
        models: [],
        workspaces: [],
        theme: { version: "theme-v2", colors: [] },
      },
      setAgentRole: (_id, action) => {
        if (action) setCurrent(action);
      },
    } as ReturnType<typeof useAgentEditor>);
    return <AgentEditorRoleSupport {...args} role={current} />;
  },
} satisfies Meta<typeof AgentEditorRoleSupport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ChatSupport: Story = {};
export const Calculator: Story = { args: { kind: "toolCalculator" } };
export const FunctionsOff: Story = {
  args: {
    role: {
      ...role,
      toolChatAwareness: {
        active: true,
        updateChatLabel: false,
        recommendNextMessages: false,
        currentDateTime: false,
      },
    },
  },
};
export const Toggle: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("switch", {
      name: /Antwortvorschläge anbieten|Offer reply suggestions/,
    });
    await userEvent.click(toggle);
    await expect(toggle).not.toBeChecked();
  },
};
export const Remove: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /Werkzeug entfernen|Remove tool/ }),
    );
  },
};
