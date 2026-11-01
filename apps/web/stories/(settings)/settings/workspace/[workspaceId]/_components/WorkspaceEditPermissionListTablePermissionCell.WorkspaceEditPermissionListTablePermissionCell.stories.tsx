import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditPermissionListTablePermissionCell } from "../../../../../../app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListTablePermissionCell";

const meta = {
  title:
    "Web/(settings)/settings/workspace/[workspaceId]/WorkspaceEditPermissionListTablePermissionCell",
  component: WorkspaceEditPermissionListTablePermissionCell,
  args: {
    user: {
      workspaceRole: "editor",
      id: "11111111-1111-4111-8111-111111111111",
      email: "alex@example.test",
      firstName: "Alex",
      lastName: "Beispiel",
      name: "Beispiel",
      signInMethod: "email",
      lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
    },
    workspaceId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof WorkspaceEditPermissionListTablePermissionCell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const User_workspaceRole_editor: Story = { args: {} };
export const User_workspaceRole_user: Story = {
  args: {
    user: {
      workspaceRole: "user",
      id: "11111111-1111-4111-8111-111111111111",
      email: "alex@example.test",
      firstName: "Alex",
      lastName: "Beispiel",
      name: "Beispiel",
      signInMethod: "email",
      lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
    },
  },
};
export const User_workspaceRole_workspace_admin: Story = {
  args: {
    user: {
      workspaceRole: "workspace-admin",
      id: "11111111-1111-4111-8111-111111111111",
      email: "alex@example.test",
      firstName: "Alex",
      lastName: "Beispiel",
      name: "Beispiel",
      signInMethod: "email",
      lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
    },
  },
};
export const User_workspaceRole_none: Story = {
  args: {
    user: {
      workspaceRole: "none",
      id: "11111111-1111-4111-8111-111111111111",
      email: "alex@example.test",
      firstName: "Alex",
      lastName: "Beispiel",
      name: "Beispiel",
      signInMethod: "email",
      lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
    },
  },
};
export const User_signInMethod_email: Story = { args: {} };
export const User_signInMethod_sso: Story = {
  args: {
    user: {
      workspaceRole: "editor",
      id: "11111111-1111-4111-8111-111111111111",
      email: "alex@example.test",
      firstName: "Alex",
      lastName: "Beispiel",
      name: "Beispiel",
      signInMethod: "sso",
      lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
    },
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
