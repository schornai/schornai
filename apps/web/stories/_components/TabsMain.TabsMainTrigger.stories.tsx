import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsMainTrigger } from "../../app/_components/TabsMain";

const meta = {
  title: "Web/TabsMainTrigger",
  component: TabsMainTrigger,
  args: { children: "Beispielinhalt", view: "table" },
} satisfies Meta<typeof TabsMainTrigger>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
