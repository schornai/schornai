import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditorAvatar } from "../../../app/(settings)/_components/EditorAvatar";

const meta = {
  tags: ["async-component"],
  title: "Web/(settings)/EditorAvatar",
  component: EditorAvatar,
  args: {
    avatarUrl: "Beispiel",
    firstName: "Alex",
    lastName: "Beispiel",
    targetUserId: "11111111-1111-4111-8111-111111111111",
    userId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof EditorAvatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AvatarUrl_missing: Story = { args: { avatarUrl: undefined } };
export const FirstName_missing: Story = { args: { firstName: undefined } };
export const LastName_missing: Story = { args: { lastName: undefined } };
export const TargetUserId_missing: Story = {
  args: { targetUserId: undefined },
};

export const Empty: Story = { parameters: { scenario: "empty" } };
