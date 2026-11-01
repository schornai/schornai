import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarFavoriteItemDocumentRepository } from "../../../app/(main)/_components/SidebarFavoriteItem";

const meta = {
  title: "Web/(main)/SidebarFavoriteItemDocumentRepository",
  component: SidebarFavoriteItemDocumentRepository,
  args: {
    documentRepository: {
      type: "database-v2",
      description: "Eine Beschreibung für Storybook.",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
      color: { oklchHue: 284, type: "color-oklch-hue" },
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
    },
  },
} satisfies Meta<typeof SidebarFavoriteItemDocumentRepository>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DocumentRepository_database_v2_database_v2: Story = { args: {} };
export const DocumentRepository_missing: Story = {
  args: { documentRepository: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
