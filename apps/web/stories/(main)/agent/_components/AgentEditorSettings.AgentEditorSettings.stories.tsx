import { within, waitFor, expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorSettings } from "../../../../app/(main)/agent/_components/AgentEditorSettings";

const meta = {
  title: "Web/(main)/agent/AgentEditorSettings",
  component: AgentEditorSettings,
  args: {},
  parameters: { serviceFixtures: { actionResult: { globalId: "beispiel" } } },
} satisfies Meta<typeof AgentEditorSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(canvasElement).getByLabelText("Globale ID")).toHaveValue(
        "beispiel",
      ),
    );
  },
};
