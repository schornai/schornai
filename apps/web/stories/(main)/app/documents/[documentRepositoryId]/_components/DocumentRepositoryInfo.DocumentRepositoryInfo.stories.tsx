import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryInfo } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfo";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryInfo",
  component: DocumentRepositoryInfo,
  args: {
    editDocumentRepositoryPathname: "/",
    editDefaultDocumentRepository: {
      type: "database-v2",
      description: "Eine Beschreibung für Storybook.",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
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
    },
    editable: false,
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    modelMap: new Map(),
    documentRepository: {
      type: "database-v2",
      description: "Eine Beschreibung für Storybook.",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
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
    },
    transcriberMap: new Map(),
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
} satisfies Meta<typeof DocumentRepositoryInfo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const EditDocumentRepositoryPathname_missing: Story = {
  args: { editDocumentRepositoryPathname: undefined },
};
export const EditDefaultDocumentRepository_missing: Story = {
  args: { editDefaultDocumentRepository: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const ModelMap_missing: Story = { args: { modelMap: undefined } };
export const DocumentRepository_missing: Story = {
  args: { documentRepository: undefined },
};
export const TranscriberMap_missing: Story = {
  args: { transcriberMap: undefined },
};
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
