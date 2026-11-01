import { openDialog } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorDiscardAllChanges } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorDiscardAllChanges";

const meta = {
  title:
    "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorDiscardAllChanges",
  component: TranscriberEditorDiscardAllChanges,
  args: {},
} satisfies Meta<typeof TranscriberEditorDiscardAllChanges>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ConfirmationOpened: Story = {
  parameters: {
    contextFixtures: {
      useTranscriberEditor: {
        transcriber: { name: "Geändert" },
        defaultTranscriber: { name: "Beispiel" },
      },
    },
  },
  play: openDialog,
};

export const Unchanged: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useTranscriberEditor: {
        transcriber: { name: "Beispiel" },
        defaultTranscriber: { name: "Beispiel" },
      },
    },
  },
};

export const Changed: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useTranscriberEditor: {
        transcriber: { name: "Geändert" },
        defaultTranscriber: { name: "Beispiel" },
      },
    },
  },
};
