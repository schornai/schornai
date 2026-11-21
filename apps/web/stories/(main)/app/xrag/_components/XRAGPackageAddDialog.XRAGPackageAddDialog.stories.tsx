import { userEvent, within, expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGPackageAddDialog } from "../../../../../app/_components/xrag/XRAGPackageAddDialog";
import { packageOptions } from "./packageOptions.fixture";
const meta = {
  title: "Web/(main)/app/xrag/XRAGPackageAddDialog",
  component: XRAGPackageAddDialog,
  args: { kind: "agent", id: "agent" },
  parameters: { serviceFixtures: { actionResult: packageOptions } },
} satisfies Meta<typeof XRAGPackageAddDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    const body = within(canvasElement.ownerDocument.body);
    const checkbox = await body.findByRole("checkbox", {
      name: /Wissensdatenbank/,
    });
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await expect(
      body.queryByRole("link", { name: "XRAG-Paket erstellen" }),
    ).not.toBeInTheDocument();
  },
};
export const Empty: Story = {
  parameters: {
    serviceFixtures: { actionResult: { packages: [], related: [] } },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("link", {
        name: "XRAG-Paket erstellen",
      }),
    ).toHaveAttribute("href", "/app/xrag/export");
  },
};
export const Model: Story = {
  args: { kind: "model" },
  parameters: {
    serviceFixtures: { actionResult: { ...packageOptions, related: [] } },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("combobox"),
    ).toBeVisible();
  },
};
export const LoadError: Story = {
  parameters: { scenario: "error" },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("alert"),
    ).toBeVisible();
  },
};
