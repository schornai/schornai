import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { SelectTriggerAction } from "./select-trigger-action.tsx";

import { Select, SelectValue, SelectContent, SelectItem } from "./select.tsx";
const meta = {
  title: "UI/SelectTriggerAction",
  component: SelectTriggerAction,
  decorators: [
    (Story) => (
      <Select defaultValue="example">
        <Story />
        <SelectContent>
          <SelectItem value="example">Beispiel</SelectItem>
        </SelectContent>
      </Select>
    ),
  ],
  args: { children: <SelectValue /> },
} satisfies Meta<typeof SelectTriggerAction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Idle: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Pending: Story = {
  args: { isPending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeDisabled();
  },
};
export const Error: Story = { args: { hasErrored: true } };
export const Success: Story = { args: { hasSucceeded: true } };
export const PendingError: Story = {
  args: { isPending: true, hasErrored: true },
};
export const PendingSuccess: Story = {
  args: { isPending: true, hasSucceeded: true },
};

export const Opened: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    canvas.getByRole("combobox").focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("listbox"),
    ).toBeVisible();
  },
};
export const Focus: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("combobox")).toHaveFocus();
  },
};
export const BothResults: Story = {
  args: { hasErrored: true, hasSucceeded: true },
};
