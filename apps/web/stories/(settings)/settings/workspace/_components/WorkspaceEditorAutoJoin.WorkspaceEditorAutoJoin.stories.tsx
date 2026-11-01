import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditorAutoJoin } from "../../../../../app/(settings)/settings/workspace/_components/WorkspaceEditorAutoJoin";

const meta = {
  title: "Web/(settings)/settings/workspace/WorkspaceEditorAutoJoin",
  component: WorkspaceEditorAutoJoin,
  args: {
    autoJoin: false,
    workspaceId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof WorkspaceEditorAutoJoin>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AutoJoin_false: Story = { args: {} };
export const AutoJoin_true: Story = { args: { autoJoin: true } };
export const AutoJoin_missing: Story = { args: { autoJoin: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
