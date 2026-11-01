import { expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriptionSegmentEditor } from "../../../app/_components/transcription/TranscriptionSegmentEditor";
const meta = {
  title: "Web/transcription/TranscriptionSegmentEditor",
  component: TranscriptionSegmentEditor,
  args: {
    segment: {
      timeStart: 0,
      timeEnd: 12,
      noSpeechProbability: 0,
      words: [
        {
          word: "Hier lässt sich der erkannte Text korrigieren.",
          timeStart: 0,
          timeEnd: 12,
          probability: 0.98,
        },
      ],
    },
    onSave: async (): Promise<"errorSave" | "errorConflict" | undefined> =>
      undefined,
    onCancel: () => {},
  },
} satisfies Meta<typeof TranscriptionSegmentEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const textbox = canvas.getByRole("textbox");
    await userEvent.click(textbox);
    await expect(textbox).toHaveFocus();
  },
};
const showSaveError: Story["play"] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: "Speichern" }));
  await expect(await canvas.findByRole("alert")).toBeVisible();
};
export const SaveError: Story = {
  args: { onSave: async () => "errorSave" },
  play: showSaveError,
};
export const Conflict: Story = {
  args: { onSave: async () => "errorConflict" },
  play: showSaveError,
};
