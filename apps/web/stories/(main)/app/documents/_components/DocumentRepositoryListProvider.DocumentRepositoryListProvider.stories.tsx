import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryListProvider } from "../../../../../app/(main)/app/documents/_components/DocumentRepositoryListProvider";

const meta = {
  title: "Web/(main)/app/documents/DocumentRepositoryListProvider",
  component: DocumentRepositoryListProvider,
  args: {
    documentRepositoriesWithFavorite: [
      {
        description: "Eine Beschreibung für Storybook.",
        id: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        identifier: "11111111-1111-4111-8111-111111111111",
        type: "database-v2",
        color: { type: "color-oklch-hue", oklchHue: 284 },
        icon: { iconName: "bot", type: "icon-lucide" },
        index: {
          embedding: {
            active: false,
            modelIdentifier: "example-model",
            modelVectorSize: 384,
          },
          keyword: { active: false },
        },
        transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
        favorite: false,
      },
    ],
    children: "Beispielinhalt",
    id: "11111111-1111-4111-8111-111111111111",
    userPreferences: { group: "no-group", sort: "name:asc", view: "table" },
  },
} satisfies Meta<typeof DocumentRepositoryListProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const DocumentRepositoriesWithFavoriteEmpty: Story = {
  args: { documentRepositoriesWithFavorite: [] },
};
export const DocumentRepositoriesWithFavoriteMultiple: Story = {
  args: {
    documentRepositoriesWithFavorite: repeatFixtures(
      meta.args["documentRepositoriesWithFavorite"],
    ),
  },
};
