import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberListTable } from "../../../../../app/(main)/app/transcribe/_components/TranscriberListTable";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberListTable",
  component: TranscriberListTable,
  args: {
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    modelMap: new Map(),
    workspaceMap: new Map(),
  },
} satisfies Meta<typeof TranscriberListTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
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
