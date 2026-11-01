import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberIconGroupActionFavorite } from "../../../../../app/(main)/app/transcribe/_components/TranscriberIconGroupActionFavorite";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberIconGroupActionFavorite",
  component: TranscriberIconGroupActionFavorite,
  args: {
    transcriber: {
      id: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      version: "transcriber-v2",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      color: { oklchHue: 284, type: "color-oklch-hue" },
      description: "Eine Beschreibung für Storybook.",
      icon: { iconName: "bot", type: "icon-lucide" },
      modelIdentifier: "example-model",
      prompt: "Beantworte die Frage verständlich.",
    },
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
  },
} satisfies Meta<typeof TranscriberIconGroupActionFavorite>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
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
