import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsSubList } from "../../app/_components/Tabs";

const meta = {
  title: "Web/TabsSubList",
  component: TabsSubList,
  args: { children: "Beispielinhalt", variant: "default" },
} satisfies Meta<typeof TabsSubList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Variant_default: Story = { args: {} };
export const Variant_line: Story = { args: { variant: "line" } };
export const Variant_missing: Story = { args: { variant: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
