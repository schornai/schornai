import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditorOverview } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorOverview";

const meta = {
  title: "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorOverview",
  component: TranscriberEditorOverview,
  args: {
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    mode: "create",
  },
} satisfies Meta<typeof TranscriberEditorOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mode_create: Story = { args: {} };
export const Mode_update: Story = { args: { mode: "update" } };
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
