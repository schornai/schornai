import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGImportContents } from "../../../../../app/(main)/app/xrag/_components/XRAGImportContents";
import { externalModelPreview, modelPreview } from "./externalModels.fixture";
const meta = {
  title: "Web/(main)/app/xrag/XRAGImportContents",
  component: XRAGImportContents,
  args: {
    entries: [...externalModelPreview.entries, ...modelPreview.entries],
    selected: [externalModelPreview.entries[0]!.archiveId],
    view: "cards",
    disabled: false,
    onChange: () => {},
  },
  render: function Render(args) {
    const [selected, setSelected] = useState(args.selected);
    return (
      <XRAGImportContents
        {...args}
        selected={selected}
        onChange={setSelected}
      />
    );
  },
} satisfies Meta<typeof XRAGImportContents>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Cards: Story = {};
export const Table: Story = {
  args: { view: "table" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("checkbox", { name: "Support Agent importieren" }),
    ).toBeChecked();
    await userEvent.click(
      canvas.getByRole("button", { name: "Alle auswählen" }),
    );
    await expect(
      canvas.getByRole("checkbox", { name: "Whisper tiny importieren" }),
    ).toBeChecked();
  },
};
