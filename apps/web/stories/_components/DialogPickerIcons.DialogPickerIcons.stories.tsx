import { openDialog } from "../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DialogPickerIcons } from "../../app/_components/DialogPickerIcons";

const meta = {
  title: "Web/DialogPickerIcons",
  component: DialogPickerIcons,
  args: { onValueChange: fn(), value: "Beispiel" },
} satisfies Meta<typeof DialogPickerIcons>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OnValueChange_missing: Story = {
  args: { onValueChange: undefined },
};
export const Value_missing: Story = { args: { value: undefined } };
export const DialogOpened: Story = { play: openDialog };
