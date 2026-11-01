import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Folder } from "../../../../../../../app/(main)/app/documents/[documentRepositoryId]/files/_components/Folder";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/app/documents/[documentRepositoryId]/files/Folder",
  component: Folder,
  args: {
    path: "/beispiel.txt",
    repository: {
      type: "database-v2",
      description: "Eine Beschreibung für Storybook.",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
      color: { type: "color-oklch-hue", oklchHue: 284 },
      icon: { type: "icon-lucide", iconName: "bot" },
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
} satisfies Meta<typeof Folder>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Repository_color_color_oklch_hue_color_oklch_hue: Story = {
  args: {},
};
export const Repository_color_color_rgb_color_rgb: Story = {
  args: {
    repository: {
      type: "database-v2",
      description: "Eine Beschreibung für Storybook.",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      identifier: "11111111-1111-4111-8111-111111111111",
      color: {
        type: "color-rgb",
        blue: 200,
        green: 80,
        red: 100,
        opacity: 0.6,
      },
      icon: { type: "icon-lucide", iconName: "bot" },
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
};
export const Repository_icon_icon_lucide_icon_lucide: Story = { args: {} };

export const Empty: Story = { parameters: { scenario: "empty" } };
