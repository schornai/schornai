import { within, waitFor, expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorSettings } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorSettings";

const meta = {
  title: "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorSettings",
  component: TranscriberEditorSettings,
  args: {},
  parameters: { serviceFixtures: { actionResult: { globalId: "beispiel" } } },
} satisfies Meta<typeof TranscriberEditorSettings>;
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
