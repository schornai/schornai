import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarFavoriteItemTranscriber } from "../../../app/(main)/_components/SidebarFavoriteItem";

const meta = {
  title: "Web/(main)/SidebarFavoriteItemTranscriber",
  component: SidebarFavoriteItemTranscriber,
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
  },
} satisfies Meta<typeof SidebarFavoriteItemTranscriber>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Transcriber_missing: Story = { args: { transcriber: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
