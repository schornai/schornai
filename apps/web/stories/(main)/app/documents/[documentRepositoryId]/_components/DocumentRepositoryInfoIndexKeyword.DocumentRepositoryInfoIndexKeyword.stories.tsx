import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryInfoIndexKeyword } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfoIndexKeyword";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryInfoIndexKeyword",
  component: DocumentRepositoryInfoIndexKeyword,
  args: {
    editPathname: "/",
    editDefaultIndexKeywordActive: false,
    editable: false,
    indexKeywordActive: false,
  },
} satisfies Meta<typeof DocumentRepositoryInfoIndexKeyword>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EditDefaultIndexKeywordActive_false: Story = { args: {} };
export const EditDefaultIndexKeywordActive_true: Story = {
  args: { editDefaultIndexKeywordActive: true },
};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const IndexKeywordActive_false: Story = { args: {} };
export const IndexKeywordActive_true: Story = {
  args: { indexKeywordActive: true },
};
export const EditPathname_missing: Story = {
  args: { editPathname: undefined },
};
export const EditDefaultIndexKeywordActive_missing: Story = {
  args: { editDefaultIndexKeywordActive: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
export const IndexKeywordActive_missing: Story = {
  args: { indexKeywordActive: undefined },
};
export const Opened: Story = { play: openDisclosure };
