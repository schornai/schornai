import { within, waitFor, expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorSettings } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorSettings";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorSettings",
  component: DocumentRepositoryEditorSettings,
  args: {},
  parameters: { serviceFixtures: { actionResult: { globalId: "beispiel" } } },
} satisfies Meta<typeof DocumentRepositoryEditorSettings>;
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
