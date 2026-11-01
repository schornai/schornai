import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberListProvider } from "../../../../../app/(main)/app/transcribe/_components/TranscriberListProvider";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberListProvider",
  component: TranscriberListProvider,
  args: {
    transcriberWithFavorite: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        identifier: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        version: "transcriber-v2",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        color: { type: "color-oklch-hue", oklchHue: 284 },
        description: "Eine Beschreibung für Storybook.",
        icon: { type: "icon-lucide", iconName: "bot" },
        modelIdentifier: "example-model",
        prompt: "Beantworte die Frage verständlich.",
        favorite: false,
      },
    ],
    children: "Beispielinhalt",
    id: "11111111-1111-4111-8111-111111111111",
    userPreferences: { group: "no-group", sort: "name:asc", view: "table" },
  },
} satisfies Meta<typeof TranscriberListProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const TranscriberWithFavoriteEmpty: Story = {
  args: { transcriberWithFavorite: [] },
};
export const TranscriberWithFavoriteMultiple: Story = {
  args: {
    transcriberWithFavorite: repeatFixtures(
      meta.args["transcriberWithFavorite"],
    ),
  },
};
