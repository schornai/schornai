import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InputChangeIndicator } from "../../app/_components/InputChangeIndicator";

const meta = {
  title: "Web/InputChangeIndicator",
  component: InputChangeIndicator,
  args: {},
} satisfies Meta<typeof InputChangeIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unchanged: Story = {
  args: { value: "Alt", defaultValue: "Alt", onChange: fn() },
};
export const Changed: Story = {
  args: { value: "Neu", defaultValue: "Alt", onChange: fn() },
};
export const Disabled: Story = { args: { value: "Neu", disabled: true } };
export const ReadOnly: Story = { args: { value: "Neu", readOnly: true } };
