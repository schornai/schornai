import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorSettingsAdditionalFunctions } from "../../../../app/(main)/agent/_components/AgentEditorSettingsAdditionalFunctions";

const meta = {
  title: "Web/(main)/agent/AgentEditorSettingsAdditionalFunctions",
  component: AgentEditorSettingsAdditionalFunctions,
  args: {},
} satisfies Meta<typeof AgentEditorSettingsAdditionalFunctions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };

export const Enabled: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: { additionalFunctions: { fileUpload: true, batch: true } },
      },
    },
  },
};
export const MissingSettings: Story = {
  tags: ["state-coverage"],
  parameters: { contextFixtures: { useAgentEditor: { agent: undefined } } },
};
export const TranscriberSelected: Story = {
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: { transcriberIdentifier: "speech" },
        relations: {
          transcribers: [
            { id: "speech-id", identifier: "speech", name: "Besprechungen" },
          ],
        },
      },
    },
  },
};

export const DisappearingDefaultOn: Story = {
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: {
          additionalFunctions: {
            fileUpload: true,
            batch: true,
            disappearingChats: "default-on",
          },
        },
      },
    },
  },
};
export const Disabled: Story = {
  parameters: {
    contextFixtures: {
      useAgentEditor: {
        agent: {
          additionalFunctions: {
            fileUpload: false,
            batch: false,
            disappearingChats: false,
          },
        },
      },
    },
  },
};
