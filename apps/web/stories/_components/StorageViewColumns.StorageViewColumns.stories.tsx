import { expect, fireEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent } from "storybook/test";
import { StorageViewColumns } from "../../app/_components/StorageViewColumns";

const folder = (name: string, path: string) => ({ folder: true, name, path });
const file = {
  file: true,
  name: "Budget 2026.pdf",
  path: "Projekte/2026/Budget 2026.pdf",
  size: 24000,
  type: "application/pdf",
  createdAtISO: "2026-01-15T12:00:00.000Z",
  updatedAtISO: "2026-01-15T12:00:00.000Z",
};
const meta = {
  title: "Web/StorageViewColumns",
  component: StorageViewColumns,
  parameters: {
    contextFixtures: {
      useStorageView: {
        basePathStorage: "Projekte/2026",
        view: "columns",
        storage: {
          type: "documentRepository",
          documentRepositoryId: "repository",
        },
        itemGroups: [["no-group", [file]]],
        columnFolders: [
          {
            path: "",
            objects: [
              folder("Projekte", "Projekte"),
              folder("Archiv", "Archiv"),
            ],
          },
          {
            path: "Projekte",
            objects: [
              folder("2026", "Projekte/2026"),
              folder("2025", "Projekte/2025"),
            ],
          },
          { path: "Projekte/2026", objects: [file] },
        ],
      },
    },
  },
} satisfies Meta<typeof StorageViewColumns>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const FileSelected: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Budget 2026.pdf" }),
    );
  },
};
export const Empty: Story = {
  parameters: {
    contextFixtures: {
      useStorageView: {
        basePathStorage: "",
        itemGroups: [],
        columnFolders: [{ path: "", objects: [] }],
      },
    },
  },
};

export const FileContextMenu: Story = {
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector("li:has(button)");
    expect(target).not.toBeNull();
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
