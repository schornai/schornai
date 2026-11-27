import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InfoTranscriber } from "../../../../../../app/_components/InfoTranscriber";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryInfoTranscriber",
  component: InfoTranscriber,
  args: {
    editDefaultTranscriberIdentifier: "11111111-1111-4111-8111-111111111111",
    transcriber: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
    },
    transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof InfoTranscriber>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = {
  args: { editHref: "/?view=features#transcribe" },
};
export const EditPathname_missing: Story = {
  args: { editHref: undefined },
};
export const EditDefaultTranscriberIdentifier_missing: Story = {
  args: { editDefaultTranscriberIdentifier: undefined },
};
export const Editable_missing: Story = { args: { editHref: undefined } };
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
export const TranscriberIdentifier_missing: Story = {
  args: { transcriberIdentifier: undefined },
};
export const Opened: Story = { play: openDisclosure };
