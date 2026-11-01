import { openDisclosure } from "../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditorDocs } from "../../../../../app/(settings)/settings/workspace/_components/WorkspaceEditorDocs";

const meta = {
  title: "Web/(settings)/settings/workspace/WorkspaceEditorDocs",
  component: WorkspaceEditorDocs,
  args: {
    defaultDocs: "Beispiel",
    workspaceId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof WorkspaceEditorDocs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DefaultDocs_missing: Story = { args: { defaultDocs: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const Opened: Story = { play: openDisclosure };
