import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditorAvatarUpload } from "../../../app/(settings)/_components/EditorAvatarUpload";

const meta = {
  title: "Web/(settings)/EditorAvatarUpload",
  component: EditorAvatarUpload,
  args: {},
} satisfies Meta<typeof EditorAvatarUpload>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
