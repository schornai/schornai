import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { ModelMetadataForm } from "../../../../app/(settings)/models/_components/ModelMetadataForm";
const meta = {
  title: "Web/(settings)/models/ModelMetadataForm",
  component: ModelMetadataForm,
  args: {
    model: {
      id: "demo",
      name: "Qwen3 8B",
      description:
        "## Einsatz\nLokales Sprachmodell für Gespräche und Werkzeuge.",
      type: "ollama_llm_v1",
    },
  },
} satisfies Meta<typeof ModelMetadataForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Preview: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Markdown-Vorschau" }),
    );
  },
};
export const DeleteLocal: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Modell löschen" }),
    );
  },
};
export const DeleteExternal: Story = {
  args: {
    model: {
      id: "external",
      name: "Team model",
      description: "",
      type: "external_llm_v1",
    },
  },
  play: DeleteLocal.play,
};
