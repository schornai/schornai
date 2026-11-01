import { connectionFixtures } from "../../../../.storybook/connection-fixtures";
import {
  openMenu,
  openDeleteDialog,
} from "../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditor } from "../../../../app/(main)/agent/_components/AgentEditor";

const meta = {
  title: "Web/(main)/agent/AgentEditor",
  component: AgentEditor,
  args: {
    agent: {
      description: "Eine Beschreibung für Storybook.",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      additionalFunctions: {
        batch: false,
        disappearingChats: false,
        fileUpload: false,
        nightshift: false,
        pursueGoal: false,
      },
      color: { type: "color-oklch-hue", oklchHue: 284 },
      documentation: "Beispiel",
      icon: { iconName: "bot", type: "icon-lucide" },
      modelIdentifier: "example-model",
      modelThinking: "mandatory-on",
      recommendedMessages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          message: "Beispiel",
          label: "Beispiel",
        },
      ],
      roles: [
        {
          documentRepositoryMounts: [
            {
              documentRepositoryIdentifier:
                "11111111-1111-4111-8111-111111111111",
              id: "11111111-1111-4111-8111-111111111111",
              mount: "Beispiel",
              pathRepository: "/",
              permission: "read-only",
            },
          ],
          id: "11111111-1111-4111-8111-111111111111",
          prompt: "Beantworte die Frage verständlich.",
          mcps: [
            {
              headers: {},
              id: "11111111-1111-4111-8111-111111111111",
              type: "http",
              url: "/brand/squared.png",
              name: "Beispiel",
            },
          ],
          modelIdentifierOverride: "11111111-1111-4111-8111-111111111111",
          modelThinkingOverride: "mandatory-on",
          name: "Beispiel",
          roleSelectionHint: "Beispiel",
          toolCalculator: { active: false },
          toolChatAwareness: {
            active: false,
            recommendNextMessages: false,
            updateChatLabel: false,
          },
          toolWebAccess: {
            active: false,
            webFetchAccess: "allow-all",
            webFetchAllowList: ["Beispiel"],
            webFetch: "on",
            webSearch: "on",
          },
        },
      ],
      version: "agent-config-version-4",
    },
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    mode: "create",
    relations: {
      connections: connectionFixtures,
      documentRepositories: [
        {
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
      ],
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
  },
} satisfies Meta<typeof AgentEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mode_create: Story = { args: {} };
export const Mode_update: Story = { args: { mode: "update" } };
export const Agent_missing: Story = { args: { agent: undefined } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const AgentRecommendedMessagesEmpty: Story = {
  args: { agent: { ...meta.args["agent"], recommendedMessages: [] } },
};
export const AgentRecommendedMessagesMultiple: Story = {
  args: {
    agent: {
      ...meta.args["agent"],
      recommendedMessages: repeatFixtures(
        meta.args["agent"]["recommendedMessages"],
      ),
    },
  },
};
export const AgentRolesEmpty: Story = {
  args: { agent: { ...meta.args["agent"], roles: [] } },
};
export const AgentRolesMultiple: Story = {
  args: {
    agent: {
      ...meta.args["agent"],
      roles: repeatFixtures(meta.args["agent"]["roles"]),
    },
  },
};
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
export const RelationsDocumentRepositoriesEmpty: Story = {
  args: { relations: { ...meta.args["relations"], documentRepositories: [] } },
};
export const RelationsDocumentRepositoriesMultiple: Story = {
  args: {
    relations: {
      ...meta.args["relations"],
      documentRepositories: repeatFixtures(
        meta.args["relations"]["documentRepositories"],
      ),
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
