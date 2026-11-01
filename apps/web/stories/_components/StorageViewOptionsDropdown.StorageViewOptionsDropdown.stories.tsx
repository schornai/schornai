import { expect, within, waitFor } from "storybook/test";
import { openMenu } from "../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageViewOptionsDropdown } from "../../app/_components/StorageViewOptionsDropdown";

const meta = {
  title: "Web/StorageViewOptionsDropdown",
  component: StorageViewOptionsDropdown,
  args: {},
} satisfies Meta<typeof StorageViewOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
export const ColumnsMenuOpened: Story = {
  parameters: {
    contextFixtures: {
      useStorageView: {
        storage: {
          type: "documentRepository",
          documentRepositoryId: "repository",
        },
        view: "columns",
      },
    },
  },
  play: async (context) => {
    await openMenu(context);
    const body = within(context.canvasElement.ownerDocument.body);
    const trigger = body.getByRole("menuitem", { name: /ansicht|view/i });
    trigger.focus();
    await context.userEvent.keyboard("{ArrowRight}");
    await body.findByRole("menuitemradio", {
      name: /spaltenansicht|column view/i,
    });
  },
};

export const CreateFolderDialogOpened: Story = {
  tags: ["state-coverage"],
  play: async (context) => {
    await openMenu(context);
    const body = within(context.canvasElement.ownerDocument.body);
    await context.userEvent.hover(body.getByRole("menuitem", { name: "Neu" }));
    const item = await body.findByRole("menuitem", {
      name: /neuer ordner|new folder/i,
    });
    item.focus();
    await context.userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible(), {
      timeout: 3000,
    });
  },
};
