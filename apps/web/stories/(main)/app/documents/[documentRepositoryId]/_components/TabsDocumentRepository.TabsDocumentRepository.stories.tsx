import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsDocumentRepository } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/TabsDocumentRepository";

const meta = {
  tags: ["async-component"],
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/TabsDocumentRepository",
  component: TabsDocumentRepository,
  args: {
    documentRepositoryId: "11111111-1111-4111-8111-111111111111",
    hasFulltextSearch: false,
    pathSegment: "search",
  },
} satisfies Meta<typeof TabsDocumentRepository>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const HasFulltextSearch_false: Story = { args: {} };
export const HasFulltextSearch_true: Story = {
  args: { hasFulltextSearch: true },
};
export const PathSegment_search: Story = { args: {} };
export const PathSegment_files: Story = { args: { pathSegment: "files" } };
export const PathSegment_info: Story = { args: { pathSegment: "info" } };
export const HasFulltextSearch_missing: Story = {
  args: { hasFulltextSearch: undefined },
};

export const Empty: Story = { parameters: { scenario: "empty" } };
