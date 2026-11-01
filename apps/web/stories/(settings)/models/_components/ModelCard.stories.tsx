import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ModelCard } from "../../../../app/(settings)/models/_components/ModelCard";
import type { ModelSummary } from "../../../../app/(settings)/models/modelSummary";
const meta = {
  title: "Web/(settings)/models/ModelCard",
  component: ModelCard,
  args: {
    model: {
      id: "local",
      name: "Qwen3 8B",
      description: null,
      identifier: "qwen3:8b",
      type: "ollama_llm_v1",
    } as ModelSummary,
  },
} satisfies Meta<typeof ModelCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Local: Story = {};
export const External: Story = {
  args: {
    model: {
      id: "external",
      name: "Team model",
      description: null,
      identifier: "external:demo",
      modelId: "example-chat",
      type: "external_llm_v1",
    } as ModelSummary,
  },
};
