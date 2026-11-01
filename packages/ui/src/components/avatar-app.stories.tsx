import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvatarApp } from "./avatar-app.tsx";

const meta = {
  title: "UI/AvatarApp",
  component: AvatarApp,
  args: { fallback: "Storybook Agent" },
} satisfies Meta<typeof AvatarApp>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { fallback: undefined } };
export const Whitespace: Story = { args: { fallback: "  " } };
export const OneWord: Story = { args: { fallback: "Agent" } };
export const Icon: Story = {
  args: { icon: { type: "icon-lucide", iconName: "bot" } },
};
export const Image: Story = {
  args: {
    image: {
      path: "storybook-avatar.svg",
      storage: "storybook",
      type: "supabase-storage-path",
    },
  },
};
export const BrokenImage: Story = {
  args: {
    image: {
      path: "missing.svg",
      storage: "storybook",
      type: "supabase-storage-path",
    },
  },
};
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
