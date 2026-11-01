import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorSettingsModel } from "../../../../app/(main)/agent/_components/AgentEditorSettingsModel";

const meta = {
  title: "Web/(main)/agent/AgentEditorSettingsModel",
  component: AgentEditorSettingsModel,
  args: {},
} satisfies Meta<typeof AgentEditorSettingsModel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };

export const ThinkingMandatoryOn: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: {
          version: "agent-config-version-4",
          name: "Beispiel",
          modelIdentifier: "11111111-1111-4111-8111-111111111111",
          modelThinking: "mandatory-on",
        },
      },
    },
  },
};

export const ThinkingMandatoryOff: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: {
          version: "agent-config-version-4",
          name: "Beispiel",
          modelIdentifier: "11111111-1111-4111-8111-111111111111",
          modelThinking: "mandatory-off",
        },
      },
    },
  },
};

export const ThinkingOptionalOn: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: {
          version: "agent-config-version-4",
          name: "Beispiel",
          modelIdentifier: "11111111-1111-4111-8111-111111111111",
          modelThinking: "optional-on",
        },
      },
    },
  },
};

export const ThinkingOptionalOff: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: {
          version: "agent-config-version-4",
          name: "Beispiel",
          modelIdentifier: "11111111-1111-4111-8111-111111111111",
          modelThinking: "optional-off",
        },
      },
    },
  },
};

export const NotSelected: Story = {
  tags: ["state-coverage"],
  parameters: { contextFixtures: { useAgentEditor: { agent: undefined } } },
};
