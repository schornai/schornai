import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryInfoIndexEmbedding } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfoIndexEmbedding";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryInfoIndexEmbedding",
  component: DocumentRepositoryInfoIndexEmbedding,
  args: {
    editPathname: "/",
    editDefaultIndexEmbedding: {
      active: false,
      modelIdentifier: "example-model",
      modelVectorSize: 384,
    },
    editable: false,
    embeddingModel: {
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
    indexEmbedding: {
      active: false,
      modelIdentifier: "example-model",
      modelVectorSize: 384,
    },
  },
} satisfies Meta<typeof DocumentRepositoryInfoIndexEmbedding>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const EmbeddingModel_ollama_llm_v1_ollama_llm_v1: Story = { args: {} };
export const EmbeddingModel_external_llm_v1_external_llm_v1: Story = {
  args: {
    embeddingModel: {
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
export const EmbeddingModel_ollama_embedding_v1_ollama_embedding_v1: Story = {
  args: {
    embeddingModel: {
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
export const EmbeddingModel_mlx_whisper_v1_mlx_whisper_v1: Story = {
  args: {
    embeddingModel: {
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
export const EditPathname_missing: Story = {
  args: { editPathname: undefined },
};
export const EditDefaultIndexEmbedding_missing: Story = {
  args: { editDefaultIndexEmbedding: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
export const EmbeddingModel_missing: Story = {
  args: { embeddingModel: undefined },
};
export const IndexEmbedding_missing: Story = {
  args: { indexEmbedding: undefined },
};
export const Opened: Story = { play: openDisclosure };
