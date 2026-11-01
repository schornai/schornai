import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserEditPermissionListProvider } from "../../../../../../app/(settings)/settings/user/[userId]/_components/UserEditPermissionListProvider";

const meta = {
  title: "Web/(settings)/settings/user/[userId]/UserEditPermissionListProvider",
  component: UserEditPermissionListProvider,
  args: {
    workspaces: [
      {
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
    ],
    children: "Beispielinhalt",
    id: "11111111-1111-4111-8111-111111111111",
    userPreferences: { group: "no-group", sort: "name:asc", view: "table" },
  },
} satisfies Meta<typeof UserEditPermissionListProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const WorkspacesEmpty: Story = { args: { workspaces: [] } };
export const WorkspacesMultiple: Story = {
  args: { workspaces: repeatFixtures(meta.args["workspaces"]) },
};
