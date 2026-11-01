import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryInfoTranscriber } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfoTranscriber";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryInfoTranscriber",
  component: DocumentRepositoryInfoTranscriber,
  args: {
    editPathname: "/",
    editDefaultTranscriberIdentifier: "11111111-1111-4111-8111-111111111111",
    editable: false,
    transcriber: {
      id: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      version: "transcriber-v2",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      color: { type: "color-oklch-hue", oklchHue: 284 },
      description: "Eine Beschreibung für Storybook.",
      icon: { iconName: "bot", type: "icon-lucide" },
      modelIdentifier: "example-model",
      prompt: "Beantworte die Frage verständlich.",
    },
    transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof DocumentRepositoryInfoTranscriber>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const EditPathname_missing: Story = {
  args: { editPathname: undefined },
};
export const EditDefaultTranscriberIdentifier_missing: Story = {
  args: { editDefaultTranscriberIdentifier: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
export const TranscriberIdentifier_missing: Story = {
  args: { transcriberIdentifier: undefined },
};
export const Opened: Story = { play: openDisclosure };
