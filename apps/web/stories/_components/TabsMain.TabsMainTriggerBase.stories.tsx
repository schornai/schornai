import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsMainTriggerBase } from "../../app/_components/TabsMain";

const meta = {
  title: "Web/TabsMainTriggerBase",
  component: TabsMainTriggerBase,
  args: { isCurrentView: false },
} satisfies Meta<typeof TabsMainTriggerBase>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const IsCurrentView_false: Story = { args: {} };
export const IsCurrentView_true: Story = { args: { isCurrentView: true } };
export const IsCurrentView_missing: Story = {
  args: { isCurrentView: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
