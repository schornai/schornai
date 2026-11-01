import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ModelEditor } from "../../../../app/(settings)/models/_components/ModelEditor";
import type { ModelSummary } from "../../../../app/(settings)/models/modelSummary";
const meta = {
  title: "Web/(settings)/models/ModelEditor",
  component: ModelEditor,
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div className="w-full">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
  args: {
    model: {
      id: "external",
      name: "Team model",
      description: "## Verwendung\nFür Gespräche und Dokumente.",
      identifier: "external:demo",
      type: "external_llm_v1",
      provider: "openai",
      modelId: "example-chat",
      baseUrl: "https://api.openai.com/v1",
    } as ModelSummary,
  },
} satisfies Meta<typeof ModelEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = {};
export const Connection: Story = {
  play: async ({ canvas }) => {
    await canvas.findByText("1 Modelle gefunden", {}, { timeout: 5000 });
  },
  parameters: { nextjs: { navigation: { query: { view: "connection" } } } },
};
export const Settings: Story = {
  parameters: { nextjs: { navigation: { query: { view: "settings" } } } },
};
export const Local: Story = {
  args: {
    model: {
      id: "local",
      name: "Qwen3",
      description: null,
      type: "ollama_llm_v1",
      identifier: "qwen3",
    } as ModelSummary,
  },
};
