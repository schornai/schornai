import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsMainContent } from "../../app/_components/TabsMain";

const meta = {
  title: "Web/TabsMainContent",
  component: TabsMainContent,
  args: { children: "Beispielinhalt", view: "table" },
} satisfies Meta<typeof TabsMainContent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
