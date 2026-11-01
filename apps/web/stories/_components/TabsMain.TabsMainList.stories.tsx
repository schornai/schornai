import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsMainList } from "../../app/_components/TabsMain";

const meta = {
  title: "Web/TabsMainList",
  component: TabsMainList,
  args: { children: "Beispielinhalt", stickyTop: false },
} satisfies Meta<typeof TabsMainList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const StickyTop_false: Story = { args: {} };
export const StickyTop_true: Story = { args: { stickyTop: true } };
export const StickyTop_missing: Story = { args: { stickyTop: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
