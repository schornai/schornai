import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberListCardsContainer } from "../../../../../app/(main)/app/transcribe/_components/TranscriberListCardsContainer";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberListCardsContainer",
  component: TranscriberListCardsContainer,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof TranscriberListCardsContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
