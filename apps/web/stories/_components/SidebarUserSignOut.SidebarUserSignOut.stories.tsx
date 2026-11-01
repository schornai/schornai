import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarUserSignOut } from "../../app/_components/SidebarUserSignOut";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@schornio/aibox-package-ui/components/dropdown-menu";

const meta = {
  title: "Web/SidebarUserSignOut",
  component: SidebarUserSignOut,
  decorators: [
    (Story) => (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Benutzer</DropdownMenuTrigger>
        <DropdownMenuContent>
          <Story />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  ],
  args: {},
} satisfies Meta<typeof SidebarUserSignOut>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
