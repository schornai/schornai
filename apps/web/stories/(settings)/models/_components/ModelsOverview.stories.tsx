import { expect, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { openMenu } from "../../../../.storybook/interaction-helpers";
import { ModelsOverview } from "../../../../app/(settings)/models/_components/ModelsOverview";
import type { ModelSummary } from "../../../../app/(settings)/models/modelSummary";
const optionalMetadata = {
  contextSize: undefined,
  embeddingVectorSize: undefined,
  featureThinking: undefined,
  featureTools: undefined,
  featureVision: undefined,
  fileSystemIdentifier: undefined,
  provider: undefined,
  baseUrl: undefined,
  modelId: undefined,
};
const models: ModelSummary[] = [
  {
    ...optionalMetadata,
    id: "local-chat",
    name: "Qwen3 8B",
    description: "Lokales Sprachmodell für Gespräche und Werkzeuge.",
    identifier: "qwen3:8b",
    type: "ollama_llm_v1",
    contextSize: 32768,
    featureThinking: true,
    featureTools: true,
    featureVision: false,
  },
  {
    ...optionalMetadata,
    id: "external-demo",
    name: "Team-Modell",
    identifier: "external:demo",
    type: "external_llm_v1",
    description: null,
    modelId: "team-chat",
    baseUrl: "https://api.example.com/v1",
    provider: "openai-compatible",
  },
  {
    ...optionalMetadata,
    id: "embedding",
    name: "Nomic Embed Text",
    description: null,
    identifier: "nomic-embed-text",
    type: "ollama_embedding_v1",
    embeddingVectorSize: 768,
  },
  {
    ...optionalMetadata,
    id: "transcription",
    name: "Whisper Tiny",
    description: null,
    identifier: "whisper-tiny",
    type: "mlx_whisper_v1",
    fileSystemIdentifier: "whisper-tiny",
  },
];
const meta = {
  title: "Web/(settings)/models/ModelsOverview",
  component: ModelsOverview,
  parameters: { nextjs: { navigation: { pathname: "/models", query: {} } } },
  args: { models },
} satisfies Meta<typeof ModelsOverview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Cards: Story = {};
export const Empty: Story = { args: { models: [] } };
export const Table: Story = {
  parameters: { nextjs: { navigation: { query: { view: "table" } } } },
};
export const GroupedByType: Story = {
  parameters: { nextjs: { navigation: { query: { group: "type" } } } },
};
export const GroupedByOrigin: Story = {
  parameters: {
    nextjs: { navigation: { query: { group: "origin", view: "table" } } },
  },
};
export const FirstLetter: Story = {
  parameters: { nextjs: { navigation: { query: { group: "first-letter" } } } },
};
export const MenuOpened: Story = {
  play: async (context) => {
    await openMenu(context);
    const body = within(context.canvasElement.ownerDocument.body);
    await expect(
      await body.findByRole("menuitem", { name: "Externes Modell hinzufügen" }),
    ).toHaveAttribute("href", "/models/new");
  },
};
