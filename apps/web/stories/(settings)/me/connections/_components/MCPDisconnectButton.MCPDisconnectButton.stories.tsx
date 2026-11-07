import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { MCPDisconnectButton } from "../../../../../app/(settings)/me/connections/_components/MCPDisconnectButton";
const meta = {
  title: "Web/(settings)/me/connections/MCPDisconnectButton",
  component: MCPDisconnectButton,
  args: { serverUrl: "https://mcp.example.com" },
} satisfies Meta<typeof MCPDisconnectButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
const open: NonNullable<Story["play"]> = async ({ canvasElement }) => {
  await userEvent.click(
    within(canvasElement).getByRole("button", {
      name: "Verbindung zu https://mcp.example.com trennen",
    }),
  );
  await expect(
    within(canvasElement.ownerDocument.body).getByRole("alertdialog"),
  ).toBeVisible();
};
export const Confirm: Story = { play: open };
export const Pending: Story = {
  parameters: { scenario: "pending" },
  play: open,
};
export const Error: Story = { parameters: { scenario: "error" }, play: open };
