import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceCard } from "../../../../app/(main)/workspace/_components/WorkspaceCard";

const meta = {
  title: "Web/(main)/workspace/WorkspaceCard",
  component: WorkspaceCard,
  args: {
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    isAdminView: false,
    workspace: {
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
      claim: "admin",
    },
  },
} satisfies Meta<typeof WorkspaceCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const IsAdminView_false: Story = { args: {} };
export const IsAdminView_true: Story = { args: { isAdminView: true } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const IsAdminView_missing: Story = { args: { isAdminView: undefined } };
export const Workspace_missing: Story = { args: { workspace: undefined } };
export const FavoritesFavoritesEmpty: Story = {
  args: { favorites: { ...meta.args["favorites"], favorites: [] } },
};
export const FavoritesFavoritesMultiple: Story = {
  args: {
    favorites: {
      ...meta.args["favorites"],
      favorites: repeatFixtures(meta.args["favorites"]["favorites"]),
    },
  },
};
