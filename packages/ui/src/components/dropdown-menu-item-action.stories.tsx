import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { DropdownMenuItemAction } from "./dropdown-menu-item-action.tsx";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "./dropdown-menu.tsx";
const meta = {
  title: "UI/DropdownMenuItemAction",
  component: DropdownMenuItemAction,
  decorators: [
    (Story) => (
      <DropdownMenu open>
        <DropdownMenuTrigger>Menü</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <Story />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  ],
  args: { children: "Speichern", onClick: fn() },
} satisfies Meta<typeof DropdownMenuItemAction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Idle: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Pending: Story = {
  args: { isPending: true },
  play: async () => {
    await waitFor(() =>
      expect(
        document.querySelector("[data-slot=dropdown-menu-item]"),
      ).toHaveAttribute("aria-disabled", "true"),
    );
  },
};
export const Error: Story = { args: { hasErrored: true } };
export const Success: Story = { args: { hasSucceeded: true } };
export const PendingReplace: Story = {
  args: { isPending: true, indicator: "replace" },
};
export const ErrorReplace: Story = {
  args: { hasErrored: true, indicator: "replace" },
};
export const SuccessReplace: Story = {
  args: { hasSucceeded: true, indicator: "replace" },
};
export const PendingError: Story = {
  args: { isPending: true, hasErrored: true },
};
export const PendingSuccess: Story = {
  args: { isPending: true, hasSucceeded: true },
};
export const BothResults: Story = {
  args: { hasErrored: true, hasSucceeded: true },
};
