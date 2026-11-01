import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserEditPermissionListTablePermissionCell } from "../../../../../../app/(settings)/settings/user/[userId]/_components/UserEditPermissionListTablePermissionCell";

const meta = {
  title:
    "Web/(settings)/settings/user/[userId]/UserEditPermissionListTablePermissionCell",
  component: UserEditPermissionListTablePermissionCell,
  args: {
    userId: "11111111-1111-4111-8111-111111111111",
    workspace: {
      userRole: "editor",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
    },
  },
} satisfies Meta<typeof UserEditPermissionListTablePermissionCell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Workspace_userRole_editor: Story = { args: {} };
export const Workspace_userRole_user: Story = {
  args: {
    workspace: {
      userRole: "user",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
    },
  },
};
export const Workspace_userRole_workspace_admin: Story = {
  args: {
    workspace: {
      userRole: "workspace-admin",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
    },
  },
};
export const Workspace_userRole_none: Story = {
  args: {
    workspace: {
      userRole: "none",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
    },
  },
};
export const Workspace_autoJoin_false: Story = { args: {} };
export const Workspace_autoJoin_true: Story = {
  args: {
    workspace: {
      userRole: "editor",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: true,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
    },
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
