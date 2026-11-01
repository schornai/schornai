import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarFavoriteItemWorkspace } from "../../../app/(main)/_components/SidebarFavoriteItem";

const meta = {
  title: "Web/(main)/SidebarFavoriteItemWorkspace",
  component: SidebarFavoriteItemWorkspace,
  args: {
    workspace: {
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      autoJoin: false,
    },
  },
} satisfies Meta<typeof SidebarFavoriteItemWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Workspace_missing: Story = { args: { workspace: undefined } };
