import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorFeaturesIndex } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorFeaturesIndex";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorFeaturesIndex",
  component: DocumentRepositoryEditorFeaturesIndex,
  args: {},
} satisfies Meta<typeof DocumentRepositoryEditorFeaturesIndex>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
