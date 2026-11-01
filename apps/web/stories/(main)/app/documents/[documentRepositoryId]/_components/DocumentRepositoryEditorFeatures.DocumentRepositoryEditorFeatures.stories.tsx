import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorFeatures } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorFeatures";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorFeatures",
  component: DocumentRepositoryEditorFeatures,
  args: {},
} satisfies Meta<typeof DocumentRepositoryEditorFeatures>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
