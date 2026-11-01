import { openDisclosure } from "../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberInfoPrompt } from "../../../../../app/(main)/app/transcribe/_components/TranscriberInfoPrompt";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberInfoPrompt",
  component: TranscriberInfoPrompt,
  args: {
    editTranscriberPathname: "/",
    editDefaultPrompt: "Beispiel",
    editTranscriberId: "11111111-1111-4111-8111-111111111111",
    prompt: "Beantworte die Frage verständlich.",
  },
} satisfies Meta<typeof TranscriberInfoPrompt>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EditTranscriberPathname_missing: Story = {
  args: { editTranscriberPathname: undefined },
};
export const EditDefaultPrompt_missing: Story = {
  args: { editDefaultPrompt: undefined },
};
export const EditTranscriberId_missing: Story = {
  args: { editTranscriberId: undefined },
};
export const Prompt_missing: Story = { args: { prompt: undefined } };
export const Opened: Story = { play: openDisclosure };
