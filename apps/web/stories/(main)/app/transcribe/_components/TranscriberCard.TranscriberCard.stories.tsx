import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberCard } from "../../../../../app/(main)/app/transcribe/_components/TranscriberCard";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberCard",
  component: TranscriberCard,
  args: {
    transcriber: {
      id: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      version: "transcriber-v2",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      color: { oklchHue: 284, type: "color-oklch-hue" },
      description: "Eine Beschreibung für Storybook.",
      icon: { iconName: "bot", type: "icon-lucide" },
      modelIdentifier: "example-model",
      prompt: "Beantworte die Frage verständlich.",
    },
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
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
    workspace: {
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
      claim: "admin",
    },
  },
} satisfies Meta<typeof TranscriberCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
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
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const Model_missing: Story = { args: { model: undefined } };
export const Workspace_missing: Story = { args: { workspace: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const FavoritesFavoritesEmpty: Story = {
  args: { favorites: { ...meta.args["favorites"], favorites: [] } },
};
export const FavoritesFavoritesMultiple: Story = {
  args: {
    favorites: {
      ...meta.args["favorites"],
      favorites: repeatFixtures(meta.args["favorites"]["favorites"]),
    },
  },
};
