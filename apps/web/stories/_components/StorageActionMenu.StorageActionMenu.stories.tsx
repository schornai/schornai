import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fireEvent, within } from "storybook/test";
import { StorageActionMenu } from "../../app/_components/StorageActionMenu";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";

const meta = {
  title: "Web/StorageActionMenu",
  component: StorageActionMenu,
  args: {
    trigger: <Button>Actions</Button>,
    items: (
      <DropdownMenuGroup>
        <DropdownMenuItem>Download processed text</DropdownMenuItem>
      </DropdownMenuGroup>
    ),
    children: (dropdown) => (
      <div className="min-h-48 rounded border p-4">
        Shared actions{dropdown}
      </div>
    ),
  },
} satisfies Meta<typeof StorageActionMenu>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ContextMenu: Story = {
  play: async ({ canvasElement }) => {
    fireEvent.contextMenu(within(canvasElement).getByText("Shared actions"), {
      clientX: 150,
      clientY: 80,
    });
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("menuitem"),
    ).toHaveTextContent("Download processed text");
  },
};
