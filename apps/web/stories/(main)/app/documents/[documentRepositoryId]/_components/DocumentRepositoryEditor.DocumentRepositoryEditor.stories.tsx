import {
  openMenu,
  openDeleteDialog,
} from "../../../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditor } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditor";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditor",
  component: DocumentRepositoryEditor,
  args: {
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    mode: "create",
    relations: {
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
      theme: {
        version: "theme-v2",
        colors: [
          {
            color: { oklchHue: 284, type: "color-oklch-hue" },
            id: "11111111-1111-4111-8111-111111111111",
            name: "Beispiel",
          },
        ],
        logo: {},
      },
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
      workspaces: [
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
    },
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
  },
} satisfies Meta<typeof DocumentRepositoryEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mode_create: Story = { args: {} };
export const Mode_update: Story = { args: { mode: "update" } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const DocumentRepository_missing: Story = {
  args: { documentRepository: undefined },
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
export const RelationsModelsEmpty: Story = {
  args: { relations: { ...meta.args["relations"], models: [] } },
};
export const RelationsModelsMultiple: Story = {
  args: {
    relations: {
      ...meta.args["relations"],
      models: repeatFixtures(meta.args["relations"]["models"]),
    },
  },
};
export const RelationsThemeColorsEmpty: Story = {
  args: {
    relations: {
      ...meta.args["relations"],
      theme: { ...meta.args["relations"]["theme"], colors: [] },
    },
  },
};
export const RelationsThemeColorsMultiple: Story = {
  args: {
    relations: {
      ...meta.args["relations"],
      theme: {
        ...meta.args["relations"]["theme"],
        colors: repeatFixtures(meta.args["relations"]["theme"]["colors"]),
      },
    },
  },
};
export const RelationsTranscribersEmpty: Story = {
  args: { relations: { ...meta.args["relations"], transcribers: [] } },
};
export const RelationsTranscribersMultiple: Story = {
  args: {
    relations: {
      ...meta.args["relations"],
      transcribers: repeatFixtures(meta.args["relations"]["transcribers"]),
    },
  },
};
export const RelationsWorkspacesEmpty: Story = {
  args: { relations: { ...meta.args["relations"], workspaces: [] } },
};
export const RelationsWorkspacesMultiple: Story = {
  args: {
    relations: {
      ...meta.args["relations"],
      workspaces: repeatFixtures(meta.args["relations"]["workspaces"]),
    },
  },
};
export const MenuOpened: Story = { play: openMenu };
export const ConfirmationOpened: Story = {
  args: { mode: "update" },
  play: openDeleteDialog,
};
