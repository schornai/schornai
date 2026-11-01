import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { StorageObjectActions } from "../../app/_components/StorageObjectActions";
const meta = {
  title: "Web/StorageObjectActions",
  component: StorageObjectActions,
  args: {
    storageObject: { folder: true, name: "Reports", path: "Reports" },
    storage: { type: "documentRepository", documentRepositoryId: "repository" },
    canWrite: true,
    children: (actions) => <div className="min-h-32 p-4">Reports{actions}</div>,
  },
} satisfies Meta<typeof StorageObjectActions>;
export default meta;
type Story = StoryObj<typeof meta>;
const open: Story["play"] = async ({ canvasElement }) => {
  fireEvent.contextMenu(within(canvasElement).getByText("Reports"), {
    clientX: 120,
    clientY: 80,
  });
  await within(canvasElement.ownerDocument.body).findByRole("menuitem", {
    name: /Ordner löschen|Delete folder/,
  });
};
export const Default: Story = { play: open };
export const ReadOnly: Story = {
  args: { canWrite: false },
  play: async (context) => {
    fireEvent.contextMenu(within(context.canvasElement).getByText("Reports"));
    expect(
      within(context.canvasElement.ownerDocument.body).queryByRole("menuitem", {
        name: /Ordner löschen|Delete folder/,
      }),
    ).toBeNull();
  },
};
export const CurrentFolder: Story = {
  parameters: {
    contextFixtures: { useStorageView: { basePathStorage: "Reports" } },
  },
  play: ReadOnly.play,
};
export const RootFolder: Story = {
  args: { storageObject: { folder: true, name: "Reports", path: "" } },
  play: ReadOnly.play,
};
export const Delete: Story = {
  play: async (context) => {
    await open(context);
    const body = within(context.canvasElement.ownerDocument.body);
    await userEvent.click(
      body.getByRole("menuitem", { name: /Ordner löschen|Delete folder/ }),
    );
    await expect(await body.findByRole("alertdialog")).toHaveTextContent(
      "Reports",
    );
  },
};
