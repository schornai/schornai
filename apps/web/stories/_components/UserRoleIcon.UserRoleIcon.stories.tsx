import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserRoleIcon } from "../../app/_components/UserRoleIcon";

const meta = {
  title: "Web/UserRoleIcon",
  component: UserRoleIcon,
  args: { role: "Beispiel" },
} satisfies Meta<typeof UserRoleIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Role_missing: Story = { args: { role: undefined } };
export const Admin: Story = { args: { role: "admin" } };
export const WorkspaceAdmin: Story = { args: { role: "workspace-admin" } };
export const Editor: Story = { args: { role: "editor" } };
export const User: Story = { args: { role: "user" } };
export const Unknown: Story = { args: { role: "unknown" } };
