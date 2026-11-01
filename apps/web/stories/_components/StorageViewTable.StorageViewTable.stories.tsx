import { expect, fireEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageViewTable } from "../../app/_components/StorageViewTable";

const meta = {
  title: "Web/StorageViewTable",
  component: StorageViewTable,
  args: {},
} satisfies Meta<typeof StorageViewTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };

export const FileContextMenu: Story = {
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector(
      'tbody tr:has(button[aria-haspopup="menu"])',
    );
    expect(target).not.toBeNull();
    expect(
      Array.from(canvasElement.querySelector("tbody")!.children).every(
        (child) => child.tagName === "TR",
      ),
    ).toBe(true);
    fireEvent.contextMenu(target!, { clientX: 160, clientY: 140 });
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByRole("menuitem", {
        name: /Original herunterladen|Download original/i,
      }),
    ).toBeVisible();
    expect(
      body.queryByRole("menuitem", { name: /Sortieren|Sort/i }),
    ).toBeNull();
  },
};
export const BackgroundContextMenu: Story = {
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector(
      '[data-slot="context-menu-trigger"]',
    );
    fireEvent.contextMenu(target!, { clientX: 400, clientY: 200 });
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("menuitem", {
        name: /Sortieren|Sort/i,
      }),
    ).toBeVisible();
    expect(
      within(canvasElement.ownerDocument.body).queryByRole("menuitem", {
        name: /Ordner löschen|Delete folder/i,
      }),
    ).toBeNull();
  },
};
