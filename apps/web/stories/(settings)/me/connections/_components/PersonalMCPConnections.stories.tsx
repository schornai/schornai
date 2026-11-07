import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { PersonalMCPConnections } from "../../../../../app/(settings)/me/connections/_components/PersonalMCPConnections";
import { grants, now } from "./incomingMcpFixtures";
const meta = {
  title: "Web/(settings)/me/connections/PersonalMCPConnections",
  component: PersonalMCPConnections,
  args: {
    grants,
    now,
    serverUrls: [
      "https://mcp.example.com/mcp",
      "https://tools.example.org/mcp",
    ],
  },
} satisfies Meta<typeof PersonalMCPConnections>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const IncomingOnly: Story = {
  args: { serverUrls: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Zugriff auf schorn.ai")).toBeVisible();
    await expect(
      canvas.queryByText("Verbindungen zu externen Diensten"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText("Noch keine Verbindungen"),
    ).not.toBeInTheDocument();
  },
};
export const OutgoingOnly: Story = {
  args: { grants: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Verbindungen zu externen Diensten"),
    ).toBeVisible();
    await expect(
      canvas.queryByText("Zugriff auf schorn.ai"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText("Noch keine Verbindungen"),
    ).not.toBeInTheDocument();
  },
};
export const Empty: Story = {
  args: { grants: [], serverUrls: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Noch keine Verbindungen")).toHaveLength(
      1,
    );
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
    await expect(
      canvas.queryByText("Zugriff auf schorn.ai"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText("Verbindungen zu externen Diensten"),
    ).not.toBeInTheDocument();
  },
};
