import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatToolApprovalStorageWriteFile } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApprovalStorageWriteFile";

const meta = {
  title:
    "Web/(main)/agent/[agentId]/[activityId]/ChatToolApprovalStorageWriteFile",
  component: ChatToolApprovalStorageWriteFile,
  args: { input: { path: "/example.md", content: "# Beispiel\n\nInhalt." } },
} satisfies Meta<typeof ChatToolApprovalStorageWriteFile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Opened: Story = { play: openDisclosure };
export const PlainText: Story = {
  args: { input: { path: "/example.txt", content: "Ein Text" } },
  play: openDisclosure,
};
export const EmptyContent: Story = {
  args: { input: { path: "/example.md", content: "" } },
  play: openDisclosure,
};
export const MissingInput: Story = { args: { input: undefined } };
export const InvalidInput: Story = { args: { input: 42 } };
export const MissingPath: Story = { args: { input: { content: "Inhalt" } } };
export const MissingContent: Story = {
  args: { input: { path: "/example.txt" } },
};
