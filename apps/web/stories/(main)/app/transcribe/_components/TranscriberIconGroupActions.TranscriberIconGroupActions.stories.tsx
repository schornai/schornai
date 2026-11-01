import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberIconGroupActions } from "../../../../../app/(main)/app/transcribe/_components/TranscriberIconGroupActions";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberIconGroupActions",
  component: TranscriberIconGroupActions,
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
} satisfies Meta<typeof TranscriberIconGroupActions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const Workspace_missing: Story = { args: { workspace: undefined } };
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

export const WorkspaceAdmin: Story = {
  args: { workspace: { ...meta.args.workspace, claim: "workspace-admin" } },
};
export const EditorReadOnly: Story = {
  args: { workspace: { ...meta.args.workspace, claim: "editor" } },
};
export const UserReadOnly: Story = {
  args: { workspace: { ...meta.args.workspace, claim: "user" } },
};
