import type { Meta, StoryObj } from "@storybook/react-vite";
import { ButtonDiscardChanges } from "./button-discard-changes.tsx";

const meta = {
  title: "UI/ButtonDiscardChanges",
  component: ButtonDiscardChanges,
  args: { objA: { name: "Alt" }, objB: { name: "Neu" } },
} satisfies Meta<typeof ButtonDiscardChanges>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Unchanged: Story = { args: { objB: { name: "Alt" } } };
export const Inline: Story = { args: { variant: "inline" } };
export const Disabled: Story = { args: { disabled: true } };
export const NullValues: Story = { args: { objA: null, objB: undefined } };
