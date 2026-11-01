import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberInfo } from "../../../../../app/(main)/app/transcribe/_components/TranscriberInfo";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberInfo",
  component: TranscriberInfo,
  args: {
    editTranscriberPathname: "/",
    editDefaultTranscriber: {
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
    editable: false,
    favorites: {
      favorites: [
        { id: "11111111-1111-4111-8111-111111111111", type: "workspace" },
      ],
      showInSidebar: false,
      version: "favorites-v2",
    },
    modelMap: new Map(),
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
} satisfies Meta<typeof TranscriberInfo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const EditTranscriberPathname_missing: Story = {
  args: { editTranscriberPathname: undefined },
};
export const EditDefaultTranscriber_missing: Story = {
  args: { editDefaultTranscriber: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
export const Favorites_missing: Story = { args: { favorites: undefined } };
export const ModelMap_missing: Story = { args: { modelMap: undefined } };
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
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
