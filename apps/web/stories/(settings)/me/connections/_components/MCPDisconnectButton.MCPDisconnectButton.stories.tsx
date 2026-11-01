import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MCPDisconnectButton } from "../../../../../app/(settings)/me/connections/_components/MCPDisconnectButton";
const meta = {
  title: "Web/(settings)/me/connections/MCPDisconnectButton",
  component: MCPDisconnectButton,
  args: { serverUrl: "https://mcp.example.com" },
} satisfies Meta<typeof MCPDisconnectButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
