import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ModelRemove } from "../../../../app/(settings)/models/_components/ModelRemove";
const meta = {
  title: "Web/(settings)/models/ModelRemove",
  component: ModelRemove,
  args: { model: { id: "local", name: "Qwen3 8B", type: "ollama_llm_v1" } },
} satisfies Meta<typeof ModelRemove>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
