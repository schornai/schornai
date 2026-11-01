import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LogoData } from "../../app/_components/Logo";

const meta = {
  tags: ["async-component"],
  title: "Web/LogoData",
  component: LogoData,
  args: {},
} satisfies Meta<typeof LogoData>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
