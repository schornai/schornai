import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowDownToLine, CirclePlus, CircleX } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { EditorActions } from "../../app/_components/EditorActions";

const meta = {
  title: "Web/EditorActions",
  component: EditorActions,
  args: {
    display: "overview",
    actions: [
      {
        label: "Agent speichern",
        icon: ArrowDownToLine,
        disabled: true,
        onClick: fn(),
      },
      {
        label: "Als neuen Agenten speichern",
        icon: CirclePlus,
        disabled: true,
        onClick: fn(),
      },
      {
        label: "Agent löschen",
        icon: CircleX,
        destructive: true,
        onClick: fn(),
      },
    ],
  },
} satisfies Meta<typeof EditorActions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Agent speichern" }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole("button", { name: "Agent löschen" }),
    ).toBeEnabled();
  },
};
export const Menu: Story = {
  args: { display: "menu" },
  render: (args) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>Optionen</DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto">
        <DropdownMenuGroup>
          <EditorActions {...args} />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Optionen" }));
    await expect(
      await within(document.body).findByRole("menuitem", {
        name: "Agent löschen",
      }),
    ).toBeVisible();
  },
};
