import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageViewEmpty } from "../../app/_components/StorageViewEmpty";

const meta = {
  title: "Web/StorageViewEmpty",
  component: StorageViewEmpty,
  args: {},
} satisfies Meta<typeof StorageViewEmpty>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
