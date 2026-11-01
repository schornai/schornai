import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";
import { StorageDialogCreateTextFile } from "../../app/_components/StorageDialogCreateTextFile";
const meta = {
  title: "Web/StorageDialogCreateTextFile",
  component: StorageDialogCreateTextFile,
  args: {
    open: true,
    onOpenChange: fn(),
    basePath: "",
    storage: {
      type: "documentRepository",
      workspaceId: "workspace",
      documentRepositoryId: "repo",
    },
  },
} satisfies Meta<typeof StorageDialogCreateTextFile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = {
  parameters: { scenario: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.type(
      await canvas.findByLabelText(/Dateiname|Filename/),
      "notes.txt",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /Datei anlegen|Create file/ }),
    );
    await canvas.findByRole("alert");
  },
};
export const Chat: Story = {
  args: {
    storage: { type: "activity", activityId: "activity", agentId: "agent" },
  },
};
export const Transcription: Story = {
  args: {
    storage: {
      type: "activity-transcription",
      activityId: "activity",
      transcriberId: "transcriber",
    },
  },
};
