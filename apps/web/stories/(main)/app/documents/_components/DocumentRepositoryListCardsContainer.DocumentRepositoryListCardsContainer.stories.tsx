import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryListCardsContainer } from "../../../../../app/(main)/app/documents/_components/DocumentRepositoryListCardsContainer";

const meta = {
  title: "Web/(main)/app/documents/DocumentRepositoryListCardsContainer",
  component: DocumentRepositoryListCardsContainer,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof DocumentRepositoryListCardsContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
