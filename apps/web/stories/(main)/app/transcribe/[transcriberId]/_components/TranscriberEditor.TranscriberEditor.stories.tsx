import {
  openMenu,
  openDeleteDialog,
} from "../../../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberEditor } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditor";

const meta = {
  title: "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditor",
  component: TranscriberEditor,
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
    transcriber: {
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
    },
  },
} satisfies Meta<typeof TranscriberEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mode_create: Story = { args: {} };
export const Mode_update: Story = { args: { mode: "update" } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
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
