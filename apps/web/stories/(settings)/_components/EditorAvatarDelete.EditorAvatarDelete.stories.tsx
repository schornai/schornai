import { openDialog } from "../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditorAvatarDelete } from "../../../app/(settings)/_components/EditorAvatarDelete";

const meta = {
  title: "Web/(settings)/EditorAvatarDelete",
  component: EditorAvatarDelete,
  args: { targetUserId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof EditorAvatarDelete>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TargetUserId_missing: Story = {
  args: { targetUserId: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ConfirmationOpened: Story = { play: openDialog };
