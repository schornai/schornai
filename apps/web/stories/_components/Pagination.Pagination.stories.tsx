import { expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Pagination } from "../../app/_components/Pagination";

const meta = {
  title: "Web/Pagination",
  component: Pagination,
  args: { max: 4, onChange: fn(), value: 1 },
} satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OnChange_missing: Story = { args: { onChange: undefined } };
export const Value_missing: Story = { args: { value: undefined } };
export const FirstPage: Story = { args: { value: 0 } };
export const LastPage: Story = { args: { value: 4 } };
export const OnePage: Story = { args: { max: 0, value: 0 } };
export const ManyPages: Story = { args: { max: 100, value: 50 } };
export const ChangePage: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByText("3", { exact: true }));
    await expect(args.onChange).toHaveBeenCalledWith(2);
  },
};
