import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SearchPending from "../../../../../../../app/(main)/app/documents/[documentRepositoryId]/search/_components/SearchPending";

const meta = {
  title: "Web/(main)/app/documents/[documentRepositoryId]/search/SearchPending",
  component: SearchPending,
  args: { title: "Beispiel", query: "Beispiel" },
} satisfies Meta<typeof SearchPending>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Query_missing: Story = { args: { query: undefined } };
