import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { StorageFileActions } from "../../app/_components/StorageFileActions";
const meta = {
  title: "Web/StorageFileActions",
  component: StorageFileActions,
  args: {
    canWrite: true,
    storage: {
      type: "documentRepository",
      workspaceId: "workspace",
      documentRepositoryId: "repo",
    },
    file: {
      file: true,
      name: "notes.txt",
      path: "notes.txt",
      type: "text/plain",
      size: 42,
      createdAtISO: "2026-10-17",
      updatedAtISO: "2026-10-17",
    },
  },
} satisfies Meta<typeof StorageFileActions>;
export default meta;
type Story = StoryObj<typeof meta>;
const menu: Story["play"] = async ({ canvasElement }) => {
  within(canvasElement).getByRole("button").focus();
  await userEvent.keyboard("[ArrowDown]");
  await within(canvasElement.ownerDocument.body).findByRole("menu");
};
export const Default: Story = { play: menu };
export const ReadOnly: Story = { args: { canWrite: false }, play: menu };
export const Processing: Story = { args: { busy: true }, play: menu };
export const Rename: Story = {
  play: async (context) => {
    await menu(context);
    await userEvent.click(
      await within(context.canvasElement.ownerDocument.body).findByRole(
        "menuitem",
        {
          name: /Umbenennen|Rename/,
        },
      ),
    );
  },
};
export const Delete: Story = {
  play: async (context) => {
    await menu(context);
    await userEvent.click(
      await within(context.canvasElement.ownerDocument.body).findByRole(
        "menuitem",
        {
          name: /Datei l|Delete file/,
        },
      ),
    );
  },
};
export const Reprocess: Story = {
  play: async (context) => {
    await menu(context);
    await userEvent.click(
      await within(context.canvasElement.ownerDocument.body).findByRole(
        "menuitem",
        {
          name: /Erneut|Reprocess/,
        },
      ),
    );
  },
};

export const ContextRename: Story = {
  args: {
    children: (actions) => (
      <div className="min-h-32 p-4">notes.txt{actions}</div>
    ),
  },
  play: async ({ canvasElement }) => {
    fireEvent.contextMenu(within(canvasElement).getByText("notes.txt"), {
      clientX: 120,
      clientY: 80,
    });
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: /Umbenennen|Rename/ }),
    );
    await expect(await body.findByRole("dialog")).toBeVisible();
    await expect(body.getByRole("textbox")).toHaveValue("notes.txt");
  },
};

export const Copy: Story = {
  play: async (context) => {
    await menu(context);
    const body = within(context.canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: /Kopieren nach|Copy to/ }),
    );
    await body.findByRole("button", { name: "Projekte" });
  },
};
export const Move: Story = {
  play: async (context) => {
    await menu(context);
    const body = within(context.canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: /Verschieben nach|Move to/ }),
    );
    await body.findByRole("button", { name: "Projekte" });
  },
};
