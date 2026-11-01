import type { Meta, StoryObj } from "@storybook/react-vite";
import { Math } from "./math.tsx";

const meta = {
  title: "UI/Math",
  component: Math,
  args: { children: String.raw`E = mc^2` },
} satisfies Meta<typeof Math>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { children: undefined } };
export const Fraction: Story = { args: { children: String.raw`\frac{a}{b}` } };
export const Invalid: Story = {
  args: { children: String.raw`\unknowncommand{` },
};
