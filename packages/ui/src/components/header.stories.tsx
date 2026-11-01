import type { Meta, StoryObj } from "@storybook/react-vite";
import { Header } from "./header.tsx";

const meta = {
  title: "UI/Header",
  component: Header,
  args: { children: "Überschrift" },
} satisfies Meta<typeof Header>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Long: Story = {
  args: {
    children:
      "Eine sehr lange Überschrift, die auf kleinen Bildschirmen umbricht",
  },
};
export const Empty: Story = { args: { children: undefined } };
