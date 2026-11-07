import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { IncomingMCPConnections } from "../../../../../app/(settings)/me/connections/_components/IncomingMCPConnections";
import { grants, now } from "./incomingMcpFixtures";
const meta = {
  title: "Web/(settings)/me/connections/IncomingMCPConnections",
  component: IncomingMCPConnections,
  args: { grants, now },
} satisfies Meta<typeof IncomingMCPConnections>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { grants: [] } };
const open: NonNullable<Story["play"]> = async ({ canvasElement }) => {
  await userEvent.click(
    within(canvasElement).getByRole("button", {
      name: "Zugriff für Mein KI-Assistent widerrufen",
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
