import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Logo } from "../../app/_components/Logo";

const meta = {
  tags: ["async-component"],
  title: "Web/Logo",
  component: Logo,
  args: {},
} satisfies Meta<typeof Logo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
