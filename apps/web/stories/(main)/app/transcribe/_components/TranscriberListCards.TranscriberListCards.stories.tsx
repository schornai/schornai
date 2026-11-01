import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberListCards } from "../../../../../app/(main)/app/transcribe/_components/TranscriberListCards";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberListCards",
  component: TranscriberListCards,
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
} satisfies Meta<typeof TranscriberListCards>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Favorites_showInSidebar_false: Story = { args: {} };
export const Favorites_showInSidebar_true: Story = {
  args: {
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: true,
      version: "favorites-v2",
    },
  },
};
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
