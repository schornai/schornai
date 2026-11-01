import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { ButtonAction } from "./button-action.tsx";

const meta = {
  title: "UI/ButtonAction",
  component: ButtonAction,
  args: { children: "Speichern", onClick: fn() },
} satisfies Meta<typeof ButtonAction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Idle: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Pending: Story = {
  args: { isPending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toBeDisabled();
  },
};
export const Error: Story = { args: { hasErrored: true } };
export const Success: Story = { args: { hasSucceeded: true } };
export const PendingReplace: Story = {
  args: { isPending: true, indicator: "replace" },
};
export const ErrorReplace: Story = {
  args: { hasErrored: true, indicator: "replace" },
};
export const SuccessReplace: Story = {
  args: { hasSucceeded: true, indicator: "replace" },
};
export const PendingError: Story = {
  args: { isPending: true, hasErrored: true },
};
export const PendingSuccess: Story = {
  args: { isPending: true, hasSucceeded: true },
};
export const BothResults: Story = {
  args: { hasErrored: true, hasSucceeded: true },
};
export const Click: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Hover: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button"));
  },
};
export const Focus: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button")).toHaveFocus();
  },
};
