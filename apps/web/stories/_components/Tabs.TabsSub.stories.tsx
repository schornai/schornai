import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsSub } from "../../app/_components/Tabs";

const meta = {
  title: "Web/TabsSub",
  component: TabsSub,
  args: { searchParamsKey: "Beispiel" },
} satisfies Meta<typeof TabsSub>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
