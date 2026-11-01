import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogoSchornAI } from "./logo-schornai.tsx";

const meta = {
  title: "UI/LogoSchornAI",
  component: LogoSchornAI,
  args: {},
} satisfies Meta<typeof LogoSchornAI>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Small: Story = { args: { className: "w-24" } };
export const Large: Story = { args: { className: "w-96" } };
