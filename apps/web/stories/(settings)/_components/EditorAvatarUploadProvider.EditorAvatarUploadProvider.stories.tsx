import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditorAvatarUploadProvider } from "../../../app/(settings)/_components/EditorAvatarUploadProvider";

const meta = {
  title: "Web/(settings)/EditorAvatarUploadProvider",
  component: EditorAvatarUploadProvider,
  args: {
    children: "Beispielinhalt",
    targetUserId: "11111111-1111-4111-8111-111111111111",
    userId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof EditorAvatarUploadProvider>;
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
