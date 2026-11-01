import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvatarUser } from "./avatar-user.tsx";

const meta = {
  title: "UI/AvatarUser",
  component: AvatarUser,
  args: { firstName: "Alex", lastName: "Beispiel" },
} satisfies Meta<typeof AvatarUser>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const NoName: Story = {
  args: { firstName: undefined, lastName: undefined },
};
export const FirstNameOnly: Story = { args: { lastName: undefined } };
export const LastNameOnly: Story = { args: { firstName: undefined } };
export const Image: Story = { args: { avatarUrl: "storybook-avatar.svg" } };
export const BrokenImage: Story = { args: { avatarUrl: "missing.svg" } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const TwoXL: Story = { args: { size2XL: true } };
export const EightXL: Story = { args: { size8XL: true } };
