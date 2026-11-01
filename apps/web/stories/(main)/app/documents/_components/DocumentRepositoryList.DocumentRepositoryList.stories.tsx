import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryList } from "../../../../../app/(main)/app/documents/_components/DocumentRepositoryList";

const meta = {
  title: "Web/(main)/app/documents/DocumentRepositoryList",
  component: DocumentRepositoryList,
  args: {
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    models: [
      {
        type: "ollama_llm_v1",
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: new Date("2026-01-15T12:00:00.000Z"),
        name: "Beispiel",
        description: "Eine Beschreibung für Storybook.",
        identifier: "11111111-1111-4111-8111-111111111111",
        config: {
          contextSize: 1,
          featureThinking: false,
          featureTools: false,
          featureVision: false,
          ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
        },
      },
    ],
    transcribers: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        identifier: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        version: "transcriber-v2",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        color: { type: "color-oklch-hue", oklchHue: 284 },
        description: "Eine Beschreibung für Storybook.",
        icon: { iconName: "bot", type: "icon-lucide" },
        modelIdentifier: "example-model",
        prompt: "Beantworte die Frage verständlich.",
      },
    ],
    workspaceClaims: {
      claims: [
        {
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
      ],
      isAdmin: false,
    },
  },
} satisfies Meta<typeof DocumentRepositoryList>;
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
export const WorkspaceClaims_isAdmin_false: Story = { args: {} };
export const WorkspaceClaims_isAdmin_true: Story = {
  args: {
    workspaceClaims: {
      claims: [
        {
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
      ],
      isAdmin: true,
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
export const ModelsEmpty: Story = { args: { models: [] } };
export const ModelsMultiple: Story = {
  args: { models: repeatFixtures(meta.args["models"]) },
};
export const TranscribersEmpty: Story = { args: { transcribers: [] } };
export const TranscribersMultiple: Story = {
  args: { transcribers: repeatFixtures(meta.args["transcribers"]) },
};
export const WorkspaceClaimsClaimsEmpty: Story = {
  args: { workspaceClaims: { ...meta.args["workspaceClaims"], claims: [] } },
};
export const WorkspaceClaimsClaimsMultiple: Story = {
  args: {
    workspaceClaims: {
      ...meta.args["workspaceClaims"],
      claims: repeatFixtures(meta.args["workspaceClaims"]["claims"]),
    },
  },
};
export const ViewCards: Story = {
  parameters: {
    contextFixtures: { useDocumentRepositoryList: { view: "cards" } },
  },
};
export const ViewTable: Story = {
  parameters: {
    contextFixtures: { useDocumentRepositoryList: { view: "table" } },
  },
};
export const DefaultPreferences: Story = {
  parameters: {
    contextFixtures: {
      useDocumentRepositoryList: {
        isDefaultPreferences: true,
        isUserPreferences: false,
      },
    },
  },
};
export const SavedPreferences: Story = {
  parameters: {
    contextFixtures: {
      useDocumentRepositoryList: {
        isDefaultPreferences: false,
        isUserPreferences: true,
      },
    },
  },
};
