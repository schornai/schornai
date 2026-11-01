import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ModelDetails } from "../../../../app/(settings)/models/_components/ModelDetails";
import type { ModelSummary } from "../../../../app/(settings)/models/modelSummary";
const localModel = {
  id: "local-chat",
  name: "Qwen3 8B",
  description: "Lokales Sprachmodell für Gespräche und Werkzeuge.",
  identifier: "qwen3:8b",
  type: "ollama_llm_v1",
  contextSize: 32768,
  featureThinking: true,
  featureTools: true,
  featureVision: false,
} as const;
const meta = {
  title: "Web/(settings)/models/ModelDetails",
  component: ModelDetails,
  args: { model: localModel as ModelSummary },
} satisfies Meta<typeof ModelDetails>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Language: Story = {};
export const Embedding: Story = {
  args: {
    model: {
      id: "embedding",
      name: "Nomic Embed Text",
      identifier: "nomic-embed-text",
      description: null,
      type: "ollama_embedding_v1",
      contextSize: 2048,
      embeddingVectorSize: 768,
    } as ModelSummary,
  },
};
export const Transcription: Story = {
  args: {
    model: {
      id: "whisper",
      name: "Whisper Tiny",
      identifier: "whisper-tiny",
      description: null,
      type: "mlx_whisper_v1",
      fileSystemIdentifier: "whisper-tiny",
    } as ModelSummary,
  },
};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Modelleigenschaften" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Dokumentation" }),
    );
    await expect(canvas.getByText("Kontextgröße (Tokens)")).toBeVisible();
    await expect(canvas.getByText(localModel.description)).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Dokumentation bearbeiten" }),
    ).toHaveAttribute("href", "?view=settings");
  },
};
