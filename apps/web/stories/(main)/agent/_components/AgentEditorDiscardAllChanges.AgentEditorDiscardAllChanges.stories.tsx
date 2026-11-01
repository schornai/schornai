import { openDialog } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorDiscardAllChanges } from "../../../../app/(main)/agent/_components/AgentEditorDiscardAllChanges";

const meta = {
  title: "Web/(main)/agent/AgentEditorDiscardAllChanges",
  component: AgentEditorDiscardAllChanges,
  args: {},
} satisfies Meta<typeof AgentEditorDiscardAllChanges>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ConfirmationOpened: Story = {
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: { name: "Geändert" },
        defaultAgent: { name: "Beispiel" },
      },
    },
  },
  play: openDialog,
};

export const Unchanged: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: { name: "Beispiel" },
        defaultAgent: { name: "Beispiel" },
      },
    },
  },
};

export const Changed: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: { name: "Geändert" },
        defaultAgent: { name: "Beispiel" },
      },
    },
  },
};
