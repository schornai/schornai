import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorSettings } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorSettings";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorSettings",
  component: DocumentRepositoryEditorSettings,
  args: {},
} satisfies Meta<typeof DocumentRepositoryEditorSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
