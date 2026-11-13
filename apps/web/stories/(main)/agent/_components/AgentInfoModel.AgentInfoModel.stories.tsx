import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoModel } from "../../../../app/(main)/agent/_components/AgentInfoModel";

const meta = {
  title: "Web/(main)/agent/AgentInfoModel",
  component: AgentInfoModel,
  args: {
    editAgentPathname: "/",
    editDefaultModelIdentifier: "11111111-1111-4111-8111-111111111111",
    editDefaultModelThinking: "mandatory-on",
    editRoleId: "11111111-1111-4111-8111-111111111111",
    editable: false,
    modelIdentifier: "example-model",
    modelThinking: "mandatory-on",
    model: {
      type: "ollama_llm_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: {
        contextSize: 1,
        featureThinking: false,
        featureTools: false,
        featureVision: false,
        ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
      },
    },
  },
} satisfies Meta<typeof AgentInfoModel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EditDefaultModelThinking_mandatory_on: Story = { args: {} };
export const EditDefaultModelThinking_optional_on: Story = {
  args: { editDefaultModelThinking: "optional-on" },
};
export const EditDefaultModelThinking_mandatory_off: Story = {
  args: { editDefaultModelThinking: "mandatory-off" },
};
export const EditDefaultModelThinking_optional_off: Story = {
  args: { editDefaultModelThinking: "optional-off" },
};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const ModelThinking_mandatory_on: Story = { args: {} };
export const ModelThinking_optional_on: Story = {
  args: { modelThinking: "optional-on" },
};
export const ModelThinking_mandatory_off: Story = {
  args: { modelThinking: "mandatory-off" },
};
export const ModelThinking_optional_off: Story = {
  args: { modelThinking: "optional-off" },
};
export const Model_ollama_llm_v1_ollama_llm_v1: Story = { args: {} };
export const Model_external_llm_v1_external_llm_v1: Story = {
  args: {
    model: {
      type: "external_llm_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: {
        modelId: "mistral-small-latest",
        baseUrl: "https://api.mistral.ai/v1",
        headers: {},
        provider: "mistral",
      },
    },
  },
};
export const Model_ollama_embedding_v1_ollama_embedding_v1: Story = {
  args: {
    model: {
      type: "ollama_embedding_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: {
        contextSize: 1,
        embeddingVectorSize: 384,
        ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
      },
    },
  },
};
export const Model_mlx_whisper_v1_mlx_whisper_v1: Story = {
  args: {
    model: {
      type: "mlx_whisper_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: { fileSystemIdentifier: "11111111-1111-4111-8111-111111111111" },
    },
  },
};
export const EditAgentPathname_missing: Story = {
  args: { editAgentPathname: undefined },
};
export const EditDefaultModelIdentifier_missing: Story = {
  args: { editDefaultModelIdentifier: undefined },
};
export const EditDefaultModelThinking_missing: Story = {
  args: { editDefaultModelThinking: undefined },
};
export const EditRoleId_missing: Story = { args: { editRoleId: undefined } };
export const Editable_missing: Story = { args: { editable: undefined } };
export const ModelThinking_missing: Story = {
  args: { modelThinking: undefined },
};
export const Model_missing: Story = { args: { model: undefined } };
export const Opened: Story = { play: openDisclosure };

export const ExternalOpened: Story = {
  args: Model_external_llm_v1_external_llm_v1.args,
  play: openDisclosure,
};
export const ExternalWithContextOpened: Story = {
  args: {
    model: {
      ...Model_external_llm_v1_external_llm_v1.args!.model!,
      type: "external_llm_v1",
      config: {
        provider: "mistral",
        modelId: "example",
        baseUrl: "https://api.mistral.ai/v1",
        headers: {},
        contextSize: 32768,
      },
    },
  },
  play: openDisclosure,
};
