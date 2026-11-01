import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { IconGroupButtonAction } from "./icon-group.tsx";

const meta = {
  title: "UI/IconGroupButtonAction",
  component: IconGroupButtonAction,
  args: { children: "Speichern", tooltip: "Speichern", onClick: fn() },
} satisfies Meta<typeof IconGroupButtonAction>;
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

export const Hover: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button"));
    await waitFor(
      () =>
        expect(
          canvasElement.ownerDocument.querySelector(
            '[data-slot="tooltip-content"]',
          ),
        ).toBeVisible(),
      { timeout: 5000 },
    );
  },
};
export const Focus: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button")).toHaveFocus();
    await waitFor(
      () =>
        expect(
          canvasElement.ownerDocument.querySelector(
            '[data-slot="tooltip-content"]',
          ),
        ).toBeVisible(),
      { timeout: 5000 },
    );
  },
};
